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
echo "hello" | docker compose exec -T broker /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server broker:9092 \
  --topic test
```

### Consume one message and exit

```bash
docker compose exec -it broker /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server broker:9092 \
  --topic test \
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
docker compose exec broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server broker:9092 \
  --create \
  --topic test \
  --partitions 1 \
  --replication-factor 1
```

### Describe topic

```bash
docker compose exec broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server broker:9092 \
  --describe \
  --topic test
```

### Delete topic

```bash
docker compose exec broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server broker:9092 \
  --delete \
  --topic test
```

### Produce messages interactively

```bash
docker compose exec -it broker /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server broker:9092 \
  --topic test
```

### Consume messages from beginning

```bash
docker compose exec -it broker /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server broker:9092 \
  --topic test \
  --from-beginning
```

### Consume only new messages

```bash
docker compose exec -it broker /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server broker:9092 \
  --topic test
```

### Show consumer groups

```bash
docker compose exec broker /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server broker:9092 \
  --list
```

### Describe consumer group

```bash
docker compose exec broker /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server broker:9092 \
  --describe \
  --group my-group
```
