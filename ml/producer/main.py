import os
import time
import random
import string
import base64
from confluent_kafka import Producer

BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
TOPICS = {
    'speechEvent': 'speechEvent',
    'boardEvent': 'boardEvent',
    'chatEvent': 'chatEvent',
    'summaryEvent': 'summaryEvent'
}

def generate_base64_image(size_kb=50):
    raw_bytes = os.urandom(size_kb * 1024)
    return base64.b64encode(raw_bytes).decode('utf-8')

def delivery_report(err, msg):
    if err is not None:
        print(f'Message delivery failed: {err}')
    else:
        print(f'Message delivered to {msg.topic()} [{msg.partition()}]')

def main():
    conf = {'bootstrap.servers': BOOTSTRAP_SERVERS}
    producer = Producer(conf)

    print("Producer started. Press Ctrl+C to stop.")
    try:
        while True:
            event_type = random.choice(list(TOPICS.keys()))
            topic = TOPICS[event_type]

            if event_type == 'boardEvent':
                value = generate_base64_image(size_kb=random.randint(10, 100))
                print(f"Generated boardEvent with image size: {len(value)} chars")
            else:
                value = f"Test message for {event_type} at {time.time()}"
                print(f"Generated {event_type}: {value}")

            producer.produce(topic, value=value.encode('utf-8'), callback=delivery_report)
            producer.poll(0)
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nProducer stopped.")
    finally:
        producer.flush()

if __name__ == '__main__':
    main()