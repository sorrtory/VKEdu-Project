import signal
import sys
import logging
from confluent_kafka import Consumer, KafkaError, KafkaException, Producer
import redis
import openai
from kafka_utils import wait_for_topics
from llm_utils import handle_chat_ai_request
from resources import (
    CHAT_AI_REQUEST_TOPIC, CHAT_AI_RESPONSE_TOPIC,
    BOOTSTRAP_SERVERS, GROUP_ID, AUTO_OFFSET_RESET,
    REDIS_HOST, REDIS_PORT, LLM_API_KEY, LLM_BASE_URL
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("mlout")


redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
missing_llm_settings = [
    name
    for name, value in (
        ("LLM_API_KEY", LLM_API_KEY),
        ("LLM_BASE_URL", LLM_BASE_URL),
    )
    if not value
]

if missing_llm_settings:
    logger.error(
        "Missing required MLout environment variables: %s",
        ", ".join(missing_llm_settings),
    )
    raise SystemExit(2)

llm_client = openai.OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

producer = Producer({"bootstrap.servers": BOOTSTRAP_SERVERS})


def main():
    wait_for_topics(BOOTSTRAP_SERVERS, [CHAT_AI_REQUEST_TOPIC, CHAT_AI_RESPONSE_TOPIC], logger)

    consumer_conf = {
        "bootstrap.servers": BOOTSTRAP_SERVERS,
        "group.id": GROUP_ID,
        "auto.offset.reset": AUTO_OFFSET_RESET,
        "enable.auto.commit": False,
    }
    consumer = Consumer(consumer_conf)
    consumer.subscribe([CHAT_AI_REQUEST_TOPIC])

    logger.info("MLout started. Listening to %s", CHAT_AI_REQUEST_TOPIC)

    def shutdown(sig, frame):
        logger.info("Shutting down MLout...")
        consumer.close()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    raise KafkaException(msg.error())

            raw = msg.value().decode("utf-8")
            handle_chat_ai_request(raw, redis_client, llm_client, logger)
            consumer.commit(msg)
    except KeyboardInterrupt:
        shutdown(None, None)
    except Exception:
        logger.exception("Unexpected error")
    finally:
        consumer.close()


if __name__ == "__main__":
    main()