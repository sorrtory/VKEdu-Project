import json
import time
import logging
from confluent_kafka import Producer
from resources import MAX_HISTORY_LENGTH, TOPIC_TRANSCRIPT_OUT
from vlm import describe_image

logger = logging.getLogger("mlin.handlers")

def _load_context(redis_client, room_id: str) -> dict:
    """Загружает текущий контекст из Redis."""
    key = f"conference:{room_id}"
    try:
        data = redis_client.get(key)
        return json.loads(data) if data else {}
    except Exception:
        logger.exception("Failed to load context from Redis for room %s", room_id)
        return {}


def _save_context(redis_client, room_id: str, context: dict):
    """Сохраняет контекст в Redis."""
    key = f"conference:{room_id}"
    try:
        redis_client.set(key, json.dumps(context, ensure_ascii=False))
        logger.debug("Context saved for room %s", room_id)
    except Exception:
        logger.exception("Failed to save context to Redis for room %s", room_id)


def _append_to_context(context: dict, field: str, value: str, max_len: int = MAX_HISTORY_LENGTH):
    """Добавляет значение в список с ограничением длины."""
    if field not in context:
        context[field] = []
    context[field].append(value)
    if len(context[field]) > max_len:
        context[field] = context[field][-max_len:]


def _publish_transcript(producer: Producer, room_id: str, transcript_text: str):
    """Публикует расшифровку в Kafka."""
    message = {
        "type": "transcript",
        "room_id": room_id,
        "text": transcript_text,
        "timestamp": time.time(),
    }
    try:
        producer.produce(
            TOPIC_TRANSCRIPT_OUT,
            key=room_id.encode("utf-8"),
            value=json.dumps(message, ensure_ascii=False).encode("utf-8"),
        )
        producer.poll(0)
        logger.info("Published transcript to %s: %s", TOPIC_TRANSCRIPT_OUT, transcript_text[:50])
    except Exception:
        logger.exception("Failed to publish transcript")


def handle_chat(redis_client, producer, msg_value: str):
    """Обработка сообщения из conference.chat."""
    try:
        data = json.loads(msg_value)
    except Exception:
        logger.warning("Invalid JSON in conference.chat: %s", msg_value[:100])
        return

    text = data.get("text", "").strip()
    room_id = data.get("room_id") or data.get("roomId")
    if not text or not room_id:
        return

    ctx = _load_context(redis_client, room_id)

    if "chat" not in ctx:
        ctx["chat"] = []

    ctx["chat"].append({"sender": data.get("senderName"), "text": text, "timestamp": data.get("createdAt")})

    if len(ctx["chat"]) > MAX_HISTORY_LENGTH:
        ctx["chat"] = ctx["chat"][-MAX_HISTORY_LENGTH:]

    _save_context(redis_client, room_id, ctx)

    logger.info("Chat message added to context: %s", text[:50])


def handle_chat_ai_request(redis_client, producer, msg_value: str):
    """conference.chat.ai.request – сохраняем промпт в контекст."""
    try:
        data = json.loads(msg_value)
    except Exception:
        logger.warning("Invalid JSON in chat.ai.request: %s", msg_value[:100])
        return

    text = data.get("text", "").strip()
    room_id = data.get("room_id") or data.get("roomId")
    if not text or not room_id:
        return

    ctx = _load_context(redis_client, room_id)

    _append_to_context(ctx, "ai_req", text)

    _save_context(redis_client, room_id, ctx)

    logger.info("AI request added to context: %s", text[:50])


def handle_chat_ai_response(redis_client, producer, msg_value: str):
    """conference.chat.ai.response – сохраняем ответ LLM в контекст."""
    try:
        data = json.loads(msg_value)
    except Exception:
        logger.warning("Invalid JSON in chat.ai.response: %s", msg_value[:100])
        return

    text = data.get("text", "").strip()
    room_id = data.get("room_id") or data.get("roomId")
    if not text or not room_id:
        return

    ctx = _load_context(redis_client, room_id)

    _append_to_context(ctx, "ai_resp", text)

    _save_context(redis_client, room_id, ctx)

    logger.info("AI response added to context: %s", text[:50])


def handle_chat_file(redis_client, producer, msg_value: str):
    """conference.chat.file – сохраняем S3-ссылку на файл в контекст."""
    pass # TODO


def handle_boardcrop(redis_client, producer, msg_value: str):
    """conference.boardcrop – обработка снимка доски через VLM, сохранение описания."""
    try:
        data = json.loads(msg_value)
    except Exception:
        logger.warning("Invalid JSON in boardcrop: %s", msg_value[:100])
        return

    room_id = data.get("room_id") or data.get("roomId")
    base64_image = data.get("image")
    if not room_id or not base64_image:
        return

    description = describe_image(base64_image)
    logger.info("Board description for room %s: %s", room_id, description[:50])

    ctx = _load_context(redis_client, room_id)

    if "board_descriptions" not in ctx:
        ctx["board_descriptions"] = []

    ctx["board_descriptions"].append({"timestamp": time.time(), "description": description})

    if len(ctx["board_descriptions"]) > MAX_HISTORY_LENGTH:
        ctx["board_descriptions"] = ctx["board_descriptions"][-MAX_HISTORY_LENGTH:]

    _save_context(redis_client, room_id, ctx)

    # можно подумать над тем, чтобы фигарить в транскрипт ещё и описания картинок:
    # _publish_transcript(producer, room_id, f"[Доска]: {description}")


def handle_transcript_voice(redis_client, producer, msg_value: str):
    """conference.transcript.voice – добавляет голосовую расшифровку в контекст и публикует в transcript."""
    try:
        data = json.loads(msg_value)
    except Exception:
        logger.warning("Invalid JSON in transcript.voice: %s", msg_value[:100])
        return

    text = data.get("text", "").strip()
    room_id = data.get("room_id") or data.get("roomId")
    participant = data.get("participant_identity", "unknown")
    if not text or not room_id:
        return

    transcript_line = f"{participant}: {text}"

    _publish_transcript(producer, room_id, transcript_line)

    ctx = _load_context(redis_client, room_id)

    if "transcript" not in ctx:
        ctx["transcript"] = []
    
    ctx["transcript"].append({"participant": participant, "text": text, "timestamp": data.get("timestamp")})

    if len(ctx["transcript"]) > MAX_HISTORY_LENGTH * 2:
        ctx["transcript"] = ctx["transcript"][-MAX_HISTORY_LENGTH * 2:]

    _save_context(redis_client, room_id, ctx)

    logger.info("Voice transcript added: %s", text[:50])