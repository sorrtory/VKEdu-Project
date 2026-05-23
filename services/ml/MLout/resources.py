import os

CHAT_AI_REQUEST_TOPIC = os.getenv("CHAT_AI_REQUEST_TOPIC", "conference.chat.ai.request")
CHAT_AI_RESPONSE_TOPIC = os.getenv("CHAT_AI_RESPONSE_TOPIC", "conference.chat.ai.response")

SYSTEM_PROMPT = (
    "Ты — агент-помощник платформы видеоконференций BroadBoard. "
    "Твоя задача — кратко и по делу отвечать на вопросы пользователей на русском языке, "
    "помогать им с вопросами касательно содержания конференции. "
    "Тема конференции - лекция по математике. "
    "Отвечай на русском, не более 2-3 предложений, без лишних деталей. "
    "Если не знаешь ответ или вопрос не по теме — так и скажи."
)

BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
GROUP_ID = os.getenv("KAFKA_GROUP_ID")
AUTO_OFFSET_RESET = os.getenv("KAFKA_AUTO_OFFSET_RESET")

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT"))

LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL")
LLM_MODEL = os.getenv("LLM_MODEL")
