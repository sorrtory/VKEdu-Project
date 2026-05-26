import time
from confluent_kafka.admin import AdminClient, NewTopic

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