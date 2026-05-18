# Broker

## running commands

localhost vs docker

```bash
--bootstrap-server broker:9092
--bootstrap-server localhost:29092
```

## Kafka Topics

Current topics referenced by the MVP codebase, environment config, and MVP docs:

| Topic                         | Producer                           | Consumer                                    | Purpose                                                       |
| ----------------------------- | ---------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `test`                        | Backend REST `/send` test endpoint | Backend Kafka consumer                      | Smoke-test event for Kafka wiring.                            |
| `conference.chat`             | Backend chat gateway               | ML/context pipeline                         | Chat message from a conference user.                          |
| `conference.chat.file`        | Backend conference upload flow     | ML/context pipeline                         | Uploaded conference context file metadata/S3 key.             |
| `conference.chat.ai.request`  | Backend chat gateway               | ML out/context pipeline                     | User prompt that should be answered with conference context.  |
| `conference.chat.ai.response` | ML out                             | Backend Kafka consumer, ML/context pipeline | AI answer that is persisted and broadcast to the room.        |
| `conference.summary.request`  | Backend summary ticker             | ML out                                      | Request to generate/update live meeting summary.              |
| `conference.summary.response` | ML out                             | Backend Kafka consumer                      | Summary chunk that is persisted and broadcast to the room.    |
| `conference.transcript`       | ASR/ML pipeline                    | Backend Kafka consumer                      | Transcript chunk that is persisted and broadcast to the room. |
| `conference.transcript.voice` | LiveKit/ASR pipeline               | ML/context pipeline                         | Raw voice transcript text before context processing.          |
| `conference.boardcrop`        | Backend board/smart-crop flow      | ML/context pipeline                         | Whiteboard snapshot for VLM/context extraction.               |
| `calls.transcript`            | LiveKit agent                      | Configured downstream consumer              | LiveKit agent transcript topic from `KAFKA_TRANSCRIPT_TOPIC`. |
| `calls.chat`                  | LiveKit agent                      | Configured downstream consumer              | LiveKit agent chat topic from `KAFKA_CHAT_TOPIC`.             |
| `speechEvent`                 | Configured external producer       | MLIn                                        | Default MLIn speech topic from `MLIN_KAFKA_TOPICS`.           |
| `boardEvent`                  | Configured external producer       | MLIn                                        | Default MLIn board image topic from `MLIN_KAFKA_TOPICS`.      |
| `chatEvent`                   | Configured external producer       | MLOut                                       | Default MLOut chat topic from `MLOUT_KAFKA_TOPICS`.           |
| `summaryEvent`                | Configured external producer       | MLOut                                       | Default MLOut summary topic from `MLOUT_KAFKA_TOPICS`.        |

Example topic schema:

- conference.chat.ai.response

```json
{
  "conferenceId": "string",
  "messageId": "string",
  "response": "string"
}
```

- ....

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
