import signal
import sys
import logging
from confluent_kafka import Consumer, KafkaError, KafkaException, Producer
import redis

from resources import (
    BOOTSTRAP_SERVERS,
    GROUP_ID,
    AUTO_OFFSET_RESET,
    REDIS_HOST,
    REDIS_PORT,
    TOPIC_CHAT,
    TOPIC_LIVEKIT_CHAT,
    TOPIC_CHAT_AI_REQUEST,
    TOPIC_CHAT_AI_RESPONSE,
    TOPIC_CHAT_FILE,
    TOPIC_BOARDCROP,
    TOPIC_TRANSCRIPT_VOICE,
    TOPIC_TRANSCRIPT_VOICE_LEGACY,
    TOPIC_TRANSCRIPT_OUT,
)
from kafka_utils import wait_for_topics
from handlers import (
    handle_chat,
    handle_chat_ai_request,
    handle_chat_ai_response,
    handle_chat_file,
    handle_boardcrop,
    handle_transcript_voice,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mlin")

INPUT_TOPICS = list(dict.fromkeys([
    TOPIC_CHAT,
    TOPIC_LIVEKIT_CHAT,
    TOPIC_CHAT_AI_REQUEST,
    TOPIC_CHAT_AI_RESPONSE,
    TOPIC_CHAT_FILE,
    TOPIC_BOARDCROP,
    TOPIC_TRANSCRIPT_VOICE,
    TOPIC_TRANSCRIPT_VOICE_LEGACY,
]))

ALL_REQUIRED_TOPICS = INPUT_TOPICS + [TOPIC_TRANSCRIPT_OUT]


def main():
    wait_for_topics(BOOTSTRAP_SERVERS, ALL_REQUIRED_TOPICS)

    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    producer = Producer({"bootstrap.servers": BOOTSTRAP_SERVERS})

    consumer_conf = {
        "bootstrap.servers": BOOTSTRAP_SERVERS,
        "group.id": GROUP_ID,
        "auto.offset.reset": AUTO_OFFSET_RESET,
        "enable.auto.commit": False,
    }
    consumer = Consumer(consumer_conf)
    consumer.subscribe(INPUT_TOPICS)

    logger.info("MLin started. Listening to %s", INPUT_TOPICS)

    def shutdown(sig, frame):
        logger.info("Shutting down MLin...")
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

            topic = msg.topic()
            raw = msg.value().decode("utf-8")

            try:
                if topic in (TOPIC_CHAT, TOPIC_LIVEKIT_CHAT):
                    handle_chat(redis_client, producer, raw)
                elif topic == TOPIC_CHAT_AI_REQUEST:
                    handle_chat_ai_request(redis_client, producer, raw)
                elif topic == TOPIC_CHAT_AI_RESPONSE:
                    handle_chat_ai_response(redis_client, producer, raw)
                elif topic == TOPIC_CHAT_FILE:
                    handle_chat_file(redis_client, producer, raw)
                elif topic == TOPIC_BOARDCROP:
                    handle_boardcrop(redis_client, producer, raw)
                elif topic in (TOPIC_TRANSCRIPT_VOICE, TOPIC_TRANSCRIPT_VOICE_LEGACY):
                    handle_transcript_voice(redis_client, producer, raw)
                else:
                    logger.warning("Unknown topic: %s", topic)
            except Exception:
                logger.exception("Error processing message from topic %s", topic)

            consumer.commit(msg)
    except KeyboardInterrupt:
        shutdown(None, None)
    except Exception:
        logger.exception("Unexpected error")
    finally:
        consumer.close()


if __name__ == "__main__":
    main()
