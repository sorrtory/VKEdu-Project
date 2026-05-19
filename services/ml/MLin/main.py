import os
import signal
import sys
import base64
from confluent_kafka import Consumer, KafkaError, KafkaException
import redis
import time
import json
from confluent_kafka.admin import AdminClient, NewTopic

BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'mlin_group')
TOPICS = os.getenv('KAFKA_TOPICS', 'speechEvent,boardEvent').split(',')
AUTO_OFFSET_RESET = os.getenv('KAFKA_AUTO_OFFSET_RESET', 'earliest')

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def wait_for_topics(bootstrap_servers, topics, timeout=60):
    start = time.time()
    last_error = None
    while time.time() - start < timeout:
        try:
            admin = AdminClient({'bootstrap.servers': bootstrap_servers})
            existing = set(admin.list_topics(timeout=10).topics.keys())
            missing = [t for t in topics if t not in existing]
            if missing:
                print(f"Creating topics: {missing}")
                new_topics = [NewTopic(t, num_partitions=1, replication_factor=1) for t in missing]
                fs = admin.create_topics(new_topics)
                for topic, f in fs.items():
                    f.result(timeout=10)
                    print(f"Topic {topic} created")
            else:
                print("All topics already exist")
            return
        except Exception as e:
            last_error = e
            print(f"Waiting for Kafka/topics... {e}")
            time.sleep(2)
    raise Exception(f"Failed to ensure topics after {timeout} seconds: {last_error}")

def speech_event_handler(msg):
    try:
        raw = msg.value().decode('utf-8')
        data = json.loads(raw)
    except Exception as e:
        print(f"[speechEvent] Failed to parse JSON: {e}")
        return

    text = data.get('text', '').strip()
    room_id = data.get('room_id', 'unknown-room')
    participant = data.get('participant_identity', 'unknown')
    timestamp = data.get('timestamp', '')

    if not text:
        print("[speechEvent] Empty text, skipping")
        return

    entry = json.dumps({
        "participant": participant,
        "text": text,
        "timestamp": timestamp
    }, ensure_ascii=False)

    redis_key = f"transcripts:{room_id}"

    try:
        pipe = redis_client.pipeline()
        pipe.rpush(redis_key, entry)
        pipe.ltrim(redis_key, -500, -1)
        pipe.execute()
        print(f"[speechEvent] Saved to Redis {redis_key}: {text[:80]}...")
    except Exception as e:
        print(f"[speechEvent] Redis write failed: {e}")

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
    wait_for_topics(BOOTSTRAP_SERVERS, TOPICS)
    consumer = Consumer(conf)
    print("Consumer created, subscribing...", flush=True)
    consumer.subscribe(TOPICS)
    print(f"Subscribed to {TOPICS}", flush=True)

    print(f"MLin started. Subscribed to: {TOPICS}")
    try:
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                # print("No message received", flush=True)
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