import os
import signal
import sys
from confluent_kafka import Consumer, KafkaError, KafkaException

BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'mlout_group')
TOPICS = os.getenv('KAFKA_TOPICS', 'chatEvent,summaryEvent').split(',')
AUTO_OFFSET_RESET = os.getenv('KAFKA_AUTO_OFFSET_RESET', 'earliest')

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