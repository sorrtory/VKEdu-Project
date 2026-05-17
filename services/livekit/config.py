import os
from pathlib import Path

from dotenv import load_dotenv

CONFIG_DIR = Path(__file__).resolve().parent
ENV_PATH = next(
    (
        directory / ".env"
        for directory in (CONFIG_DIR, *CONFIG_DIR.parents)
        if (directory / ".env").exists()
    ),
    None,
)

if ENV_PATH is not None:
    load_dotenv(ENV_PATH)


def require_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        raise RuntimeError(f"Missing required environment variable: {name}")

    return value


def require_float_env(name: str) -> float:
    value = require_env(name)
    try:
        return float(value)
    except ValueError as exc:
        raise RuntimeError(
            f"Environment variable {name} must be a float, got: {value}"
        ) from exc


LIVEKIT_URL = require_env("LIVEKIT_AGENT_LIVEKIT_URL")
LIVEKIT_API_KEY = require_env("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = require_env("LIVEKIT_API_SECRET")
LIVEKIT_AGENT_NAME = require_env("LIVEKIT_AGENT_NAME")

os.environ["LIVEKIT_URL"] = LIVEKIT_URL

LOG_LEVEL = require_env("LIVEKIT_AGENT_LOG_LEVEL").upper()
SILENCE_DURATION = require_float_env("LIVEKIT_AGENT_SILENCE_DURATION")

KAFKA_BOOTSTRAP_SERVERS = require_env("KAFKA_BOOTSTRAP_SERVERS")
KAFKA_TRANSCRIPT_TOPIC = require_env("KAFKA_TRANSCRIPT_TOPIC")
KAFKA_CHAT_TOPIC = require_env("KAFKA_CHAT_TOPIC")

WHISPER_MODEL_SIZE = require_env("WHISPER_MODEL_SIZE")
WHISPER_DEVICE = require_env("WHISPER_DEVICE")
WHISPER_COMPUTE_TYPE = require_env("WHISPER_COMPUTE_TYPE")
WHISPER_LANGUAGE = require_env("WHISPER_LANGUAGE")
