import os

BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
GROUP_ID = os.getenv("KAFKA_GROUP_ID")
AUTO_OFFSET_RESET = os.getenv("KAFKA_AUTO_OFFSET_RESET", "earliest")

TOPIC_CHAT = os.getenv("TOPIC_CHAT", "conference.chat")
TOPIC_CHAT_AI_REQUEST = os.getenv("TOPIC_CHAT_AI_REQUEST", "conference.chat.ai.request")
TOPIC_CHAT_AI_RESPONSE = os.getenv("TOPIC_CHAT_AI_RESPONSE", "conference.chat.ai.response")
TOPIC_CHAT_FILE = os.getenv("TOPIC_CHAT_FILE", "conference.chat.file")
TOPIC_BOARDCROP = os.getenv("TOPIC_BOARDCROP", "conference.boardcrop")
TOPIC_TRANSCRIPT_VOICE = os.getenv("TOPIC_TRANSCRIPT_VOICE", "conference.transcript.voice")
TOPIC_TRANSCRIPT_OUT = os.getenv("KAFKA_TRANSCRIPT_TOPIC", "calls.transcript")

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL")
LLM_MODEL = os.getenv("LLM_MODEL")
VLM_MODEL = os.getenv("VLM_MODEL")

MAX_HISTORY_LENGTH = 50