import os

CHAT_AI_REQUEST_TOPIC = os.getenv("CHAT_AI_REQUEST_TOPIC", "conference.chat.ai.request")
CHAT_AI_RESPONSE_TOPIC = os.getenv("CHAT_AI_RESPONSE_TOPIC", "conference.chat.ai.response")

SUMMARY_REQUEST_TOPIC = os.getenv("SUMMARY_REQUEST_TOPIC", "conference.summary.request")
SUMMARY_RESPONSE_TOPIC = os.getenv("SUMMARY_RESPONSE_TOPIC", "conference.summary.response")

SYSTEM_PROMPT = (
    "Ты — AI-ассистент платформы видеоконференций BroadBoard. "
    "Твоя задача — кратко и по делу отвечать на вопросы пользователей на русском языке, "
    "помогать им с вопросами касательно содержания конференции. "
    "Отвечай на русском, не более 2-3 предложений, без лишних деталей. "
    "Если не знаешь ответ или вопрос не по теме — так и скажи."
)

SUMMARY_SYSTEM_PROMPT = (
    "Ты — AI-ассистент платформы видеоконференций BroadBoard. "
    "На основе предоставленного контекста создай краткое описание (саммари) происходящего на конференции. "
    "Используй Markdown для оформления: заголовки, выделение (**жирный**, *курсив*),"
    "списки, блоки кода/формул при необходимости. "
    "Опиши ключевые темы, решения, вопросы, изображения с доски (если есть). "
    "Пиши на русском языке. "
    "Будь лаконичным, но не упускай важное."
    "Важно: результат обязательно должен быть в формате Markdown-текста."
)

BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
GROUP_ID = os.getenv("KAFKA_GROUP_ID")
AUTO_OFFSET_RESET = os.getenv("KAFKA_AUTO_OFFSET_RESET", "earliest")

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT"))

LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL")
LLM_MODEL = os.getenv("LLM_MODEL")
