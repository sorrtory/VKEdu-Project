import os
import signal
import sys
from confluent_kafka import Consumer, KafkaError, KafkaException
import redis
import time
from confluent_kafka.admin import AdminClient, NewTopic

BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'mlout_group')
TOPICS = os.getenv('KAFKA_TOPICS', 'chatEvent,summaryEvent').split(',')
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

def chat_event_handler(msg):
    print(f"[chatEvent] Received: {msg.value().decode('utf-8')}")

def summary_event_handler(msg):
    print(f"[summaryEvent] Received: {msg.value().decode('utf-8')}")

def signal_handler(sig, frame):
    print("\nStopping MLout...")
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
    consumer.subscribe(TOPICS)

    print(f"MLout started. Subscribed to: {TOPICS}")
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
            if topic == 'chatEvent':
                chat_event_handler(msg)
            elif topic == 'summaryEvent':
                summary_event_handler(msg)
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