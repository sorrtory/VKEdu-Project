import json
from kafka_utils import send_response_to_kafka
from resources import SYSTEM_PROMPT, LLM_MODEL, SUMMARY_RESPONSE_TOPIC, SUMMARY_SYSTEM_PROMPT

def get_context(room_id, redis_client, logger):
    """Получаем контекст конференции из Redis."""
    key = f"conference:{room_id}"
    try:
        data = redis_client.get(key)
        if data:
            return json.loads(data) if data else {}
        return {}
    except Exception as e:
        logger.error("Failed to get context from Redis: %s", e)
        return {}

def format_context_for_prompt(ctx: dict) -> str:
    """Упаковывает контекст в единый текст для промпта."""
    parts = []

    # чатик
    if "chat" in ctx and ctx["chat"]:
        lines = []
        for entry in ctx["chat"]:
            sender = entry.get("sender", "неизвестный")
            msg = entry.get("text", "")
            lines.append(f"- {sender}: {msg}")
        parts.append("Чат конференции:\n" + "\n".join(lines))

    # доска
    if "board_descriptions" in ctx and ctx["board_descriptions"]:
        lines = []
        for entry in ctx["board_descriptions"]:
            desc = entry.get("description", "")
            ts = entry.get("timestamp", "")
            lines.append(f"- {ts}: {desc}")
        parts.append("Что было на доске:\n" + "\n".join(lines))

    # речь
    if "transcript" in ctx and ctx["transcript"]:
        lines = []
        for entry in ctx["transcript"]:
            participant = entry.get("participant", "участник")
            text = entry.get("text", "")
            lines.append(f"- {participant}: {text}")
        parts.append("Расшифровка речи:\n" + "\n".join(lines))

    return "\n\n".join(parts) if parts else "Контекст пустой."

def build_messages(room_id, user_message, redis_client, logger):
    """Формирование итогового промпта."""
    ctx = get_context(room_id, redis_client, logger)
    context_text = format_context_for_prompt(ctx)
    logger.info(f"Context text example: {context_text}")

    messages = []
    messages.append({"role": "system", "content": SYSTEM_PROMPT})

    if context_text:
        messages.append({
            "role": "system",
            "content": f"Текущий контекст конференции:\n{context_text}"
        })

    # диалоги с ai
    if "ai_req" in ctx and "ai_resp" in ctx:
        for req, resp in zip(ctx.get("ai_req", []), ctx.get("ai_resp", [])):
            messages.append({"role": "user", "content": req})
            messages.append({"role": "assistant", "content": resp})

    # текущее сообщение
    messages.append({"role": "user", "content": user_message})

    return messages


def handle_chat_ai_request(raw_msg, redis_client, llm_client, producer, logger):
    """Обрабатываем одно сообщение из топика conference.chat."""
    try:
        data = json.loads(raw_msg)
    except Exception:
        logger.warning("Failed to parse message as JSON: %s", raw_msg[:100])
        return

    text = data.get("text", "").strip()
    room_id = data.get("room_id") or data.get("roomId") or "unknown-room"
    if not text or not room_id:
        return

    logger.info("Processing chat message: room=%s, text=%s", room_id, text[:80])
    messages = build_messages(room_id, text, redis_client, logger)

    try:
        response = llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.7,
        )
        answer = response.choices[0].message.content.strip()
        if not answer:
            answer = "Ответ не получен."
    except Exception as e:
        logger.error("LLM request failed: %s", e)
        answer = "Извините, произошла ошибка."

    send_response_to_kafka(room_id, answer, producer=producer, logger=logger)

    # обновление контекста
    ctx = get_context(room_id, redis_client, logger)
    if "ai_req" not in ctx:
        ctx["ai_req"] = []
    if "ai_resp" not in ctx:
        ctx["ai_resp"] = []
    ctx["ai_req"].append(text)
    ctx["ai_resp"].append(answer)

    ctx["ai_req"] = ctx["ai_req"][-10:]
    ctx["ai_resp"] = ctx["ai_resp"][-10:]
    try:
        redis_client.set(f"conference:{room_id}", json.dumps(ctx, ensure_ascii=False))
    except Exception as e:
        logger.error("Failed to update context in Redis: %s", e)

def handle_summary_request(raw_msg, redis_client, llm_client, producer, logger):
    """Генерирует саммари и отправляет в conference.summary.response."""
    # достали контекстик
    try:
        data = json.loads(raw_msg)
    except Exception:
        logger.warning("Invalid JSON in summary.request: %s", raw_msg[:100])
        return

    room_id = data.get("room_id") or data.get("roomId")
    if not room_id:
        return

    logger.info("Generating summary for room %s", room_id)
    ctx = get_context(room_id, redis_client, logger)
    context_text = format_context_for_prompt(ctx)
    # создали промпт
    messages = [
        {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
        {"role": "user", "content": f"Контекст конференции:\n{context_text if context_text else 'Нет данных.'}"},
    ]

    # генерируем
    try:
        response = llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=800,
        )
        summary = response.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Summary generation failed: %s", e)
        summary = "Ошибка генерации саммари."

    # и в кафку его
    summary_msg = {
        "type": "summary_response",
        "room_id": room_id,
        "text": summary,
        "timestamp": data.get("timestamp"),
    }
    try:
        producer.produce(
            SUMMARY_RESPONSE_TOPIC,
            key=room_id.encode("utf-8"),
            value=json.dumps(summary_msg, ensure_ascii=False).encode("utf-8"),
        )
        producer.poll(0)
        logger.info("Summary sent to %s: %s", SUMMARY_RESPONSE_TOPIC, summary)
    except Exception as e:
        logger.error("Failed to send summary to Kafka: %s", e)