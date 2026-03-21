import os
import signal
import sys
import base64
from confluent_kafka import Consumer, KafkaError, KafkaException
import redis

BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'mlin_group')
TOPICS = os.getenv('KAFKA_TOPICS', 'speechEvent,boardEvent').split(',')
AUTO_OFFSET_RESET = os.getenv('KAFKA_AUTO_OFFSET_RESET', 'earliest')

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def speech_event_handler(msg):
    print(f"[speechEvent] Received: {msg.value().decode('utf-8')}")

def board_event_handler(msg):
    base64_data = msg.value().decode('utf-8')
    print(f"[boardEvent] Received image, base64 length: {len(base64_data)} chars")
    # Декодировка:
    # image_data = base64.b64decode(base64_data)
    # print(f"Decoded image size: {len(image_data)} bytes")

def signal_handler(sig, frame):
    print("\nStopping MLin...")
    sys.exit(0)

def main():
    conf = {
        'bootstrap.servers': BOOTSTRAP_SERVERS,
        'group.id': GROUP_ID,
        'auto.offset.reset': AUTO_OFFSET_RESET,
        'enable.auto.commit': False,
    }
    consumer = Consumer(conf)
    consumer.subscribe(TOPICS)

    print(f"MLin started. Subscribed to: {TOPICS}")
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
            if topic == 'speechEvent':
                speech_event_handler(msg)
            elif topic == 'boardEvent':
                board_event_handler(msg)
            else:
                print(f"Unknown topic: {topic}")

            consumer.commit(msg)
    except KeyboardInterrupt:
        signal_handler(None, None)
    finally:
        consumer.close()

if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_handler)
    main()