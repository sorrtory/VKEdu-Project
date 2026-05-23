import json
from kafka_utils import send_response_to_kafka
from resources import SYSTEM_PROMPT, LLM_MODEL

def get_context(room_id, redis_client, logger):
    """Получаем контекст конференции из Redis."""
    key = f"conference:{room_id}"
    try:
        data = redis_client.get(key)
        if data:
            return json.loads(data)
        return {}
    except Exception as e:
        logger.error("Failed to get context from Redis: %s", e)
        return {}


def build_messages(room_id, user_message, redis_client, logger):
    """Собираем историю для LLM из контекста и текущего сообщения."""
    ctx = get_context(room_id, redis_client, logger)
    messages = []

    messages.append({"role": "system", "content": SYSTEM_PROMPT})

    if "ai_req" in ctx and "ai_resp" in ctx:
        for req, resp in zip(ctx.get("ai_req", []), ctx.get("ai_resp", [])):
            messages.append({"role": "user", "content": req})
            messages.append({"role": "assistant", "content": resp})

    # текущее сообщение
    messages.append({"role": "user", "content": user_message})

    return messages


def handle_chat_ai_request(raw_msg, redis_client, llm_client, logger):
    """Обрабатываем одно сообщение из топика calls.chat."""
    try:
        data = json.loads(raw_msg)
    except Exception:
        logger.warning("Failed to parse message as JSON: %s", raw_msg[:100])
        return

    if data.get("type") != "chat":
        logger.info("Ignoring message of type: %s", data.get("type"))
        return

    text = data.get("text", "").strip()
    room_id = data.get("room_id", "unknown-room")
    if not text or not room_id:
        return

    logger.info("Processing chat message: room=%s, text=%s", room_id, text[:80])

    messages = build_messages(room_id, text)

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

    send_response_to_kafka(room_id, answer)

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
