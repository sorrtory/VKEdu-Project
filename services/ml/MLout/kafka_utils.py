import json
import time
from confluent_kafka.admin import AdminClient, NewTopic

CHAT_AI_RESPONSE_TOPIC = "conference.chat.ai.response"

def wait_for_topics(bootstrap_servers, topics, logger, timeout=60):
    """Убеждаемся, что нужные топики существуют, иначе создаём."""
    start = time.time()
    last_error = None
    while time.time() - start < timeout:
        try:
            admin = AdminClient({"bootstrap.servers": bootstrap_servers})
            existing = set(admin.list_topics(timeout=10).topics.keys())
            missing = [t for t in topics if t not in existing]
            if missing:
                logger.info("Creating topics: %s", missing)
                new_topics = [NewTopic(t, num_partitions=1, replication_factor=1) for t in missing]
                fs = admin.create_topics(new_topics)
                for topic, f in fs.items():
                    f.result(timeout=10)
                    logger.info("Topic %s created", topic)
            else:
                logger.info("All required topics already exist")
            return
        except Exception as e:
            last_error = e
            logger.warning("Waiting for Kafka/topics... %s", e)
            time.sleep(2)
    raise Exception(f"Failed to ensure topics after {timeout} seconds: {last_error}")

def send_response_to_kafka(room_id, response_text, producer, logger):
    """Отправляем ответ LLM в Kafka."""
    message = {
        "roomId": room_id,
        "senderId": "ai",
        "senderName": "AI",
        "senderType": "ai",
        "text": response_text,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    }
    try:
        producer.produce(
            CHAT_AI_RESPONSE_TOPIC,
            key=room_id.encode("utf-8"),
            value=json.dumps(message, ensure_ascii=False).encode("utf-8"),
        )
        producer.poll(0)
        logger.info("Sent response to Kafka: %s", response_text[:80])
    except Exception as e:
        logger.error("Failed to send response to Kafka: %s", e)

