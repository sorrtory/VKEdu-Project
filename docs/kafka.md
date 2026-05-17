# Broker

## running commands

localhost vs docker

```bash
--bootstrap-server broker:9092
--bootstrap-server localhost:29092
```

## Kafka CLI commands

### Produce one message

```bash
TOPIC_NAME=test
echo '{"message":"hello"}' | docker compose exec -T broker /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server broker:9092 \
  --topic ${TOPIC_NAME}
```

### Consume one message and exit

```bash
TOPIC_NAME=test
docker compose exec -it broker /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server broker:9092 \
  --topic ${TOPIC_NAME} \
  --from-beginning \
  --max-messages 1
```

### List topics

```bash
docker compose exec broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server broker:9092 \
  --list
```

### Create topic

```bash
TOPIC_NAME=test
docker compose exec broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server broker:9092 \
  --create \
  --topic ${TOPIC_NAME} \
  --partitions 1 \
  --replication-factor 1
```

### Describe topic

```bash
TOPIC_NAME=test
docker compose exec broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server broker:9092 \
  --describe \
  --topic ${TOPIC_NAME}
```

### Delete topic

```bash
TOPIC_NAME=test
docker compose exec broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server broker:9092 \
  --delete \
  --topic ${TOPIC_NAME}
```

### Produce messages interactively

```bash
TOPIC_NAME=test
docker compose exec -it broker /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server broker:9092 \
  --topic ${TOPIC_NAME}
```

### Consume messages from beginning

```bash
TOPIC_NAME=test
docker compose exec -it broker /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server broker:9092 \
  --topic ${TOPIC_NAME} \
  --from-beginning
```

### Consume only new messages

```bash
TOPIC_NAME=test
docker compose exec -it broker /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server broker:9092 \
  --topic ${TOPIC_NAME}
```

### Show consumer groups

```bash
docker compose exec broker /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server broker:9092 \
  --list
```

### Describe consumer group

```bash
GROUP_NAME=my-group
docker compose exec broker /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server broker:9092 \
  --describe \
  --group ${GROUP_NAME}
```
