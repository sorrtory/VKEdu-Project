import json
import logging
from datetime import datetime, timezone
from typing import Any

from confluent_kafka import Producer

from config import KAFKA_BOOTSTRAP_SERVERS, KAFKA_CHAT_TOPIC, KAFKA_TRANSCRIPT_TOPIC

logger = logging.getLogger("livekit-agent.kafka")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_transcript_message(
    *,
    text: str,
    room_id: str,
    room_name: str,
    participant_id: str | None,
    participant_identity: str | None,
    sequence: int,
) -> dict[str, Any]:
    return {
        "timestamp": utc_now_iso(),
        "type": "speech",
        "room_id": room_id,
        "room_name": room_name,
        "participant_id": participant_id,
        "participant_identity": participant_identity,
        "sequence": sequence,
        "text": text,
    }


def build_chat_message(
    *,
    text: str,
    room_id: str,
    room_name: str,
    participant_id: str | None,
    participant_identity: str | None,
    sequence: int,
    chat_id: str | None,
    chat_timestamp: int | None,
    livekit_topic: str | None,
) -> dict[str, Any]:
    return {
        "timestamp": utc_now_iso(),
        "type": "chat",
        "room_id": room_id,
        "room_name": room_name,
        "participant_id": participant_id,
        "participant_identity": participant_identity,
        "sequence": sequence,
        "chat_id": chat_id,
        "chat_timestamp": chat_timestamp,
        "livekit_topic": livekit_topic,
        "text": text,
    }


class KafkaEventPublisher:
    def __init__(self) -> None:
        self._producer = Producer(
            {
                "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
                "enable.idempotence": True,
                "acks": "all",
                "retries": 10,
                "max.in.flight.requests.per.connection": 1,
                "client.id": "livekit-stt-agent",
            }
        )

    def send_speech(
        self,
        *,
        text: str,
        room_id: str,
        room_name: str,
        participant_id: str | None,
        participant_identity: str | None,
        sequence: int,
    ) -> None:
        message = build_transcript_message(
            text=text,
            room_id=room_id,
            room_name=room_name,
            participant_id=participant_id,
            participant_identity=participant_identity,
            sequence=sequence,
        )
        self._produce(
            topic=KAFKA_TRANSCRIPT_TOPIC,
            key=room_id,
            message=message,
            log_label="transcript",
        )

    def send_chat(
        self,
        *,
        text: str,
        room_id: str,
        room_name: str,
        participant_id: str | None,
        participant_identity: str | None,
        sequence: int,
        chat_id: str | None,
        chat_timestamp: int | None,
        livekit_topic: str | None,
    ) -> None:
        message = build_chat_message(
            text=text,
            room_id=room_id,
            room_name=room_name,
            participant_id=participant_id,
            participant_identity=participant_identity,
            sequence=sequence,
            chat_id=chat_id,
            chat_timestamp=chat_timestamp,
            livekit_topic=livekit_topic,
        )
        self._produce(
            topic=KAFKA_CHAT_TOPIC,
            key=room_id,
            message=message,
            log_label="chat",
        )

    def flush(self, timeout: float = 5) -> None:
        self._producer.flush(timeout)

    def _produce(
        self,
        *,
        topic: str,
        key: str,
        message: dict[str, Any],
        log_label: str,
    ) -> None:
        try:
            self._producer.produce(
                topic,
                key=key.encode("utf-8"),
                value=json.dumps(message, ensure_ascii=False).encode("utf-8"),
                on_delivery=self._delivery_report,
            )
            self._producer.poll(0)
            logger.info(
                "Queued %s to Kafka: topic=%s key=%s sequence=%s text=%s",
                log_label,
                topic,
                key,
                message.get("sequence"),
                message.get("text"),
            )
        except BufferError:
            logger.exception("Kafka producer queue is full while sending %s", log_label)
            self._producer.poll(1)
        except Exception:
            logger.exception("Kafka %s produce failed", log_label)

    @staticmethod
    def _delivery_report(err, msg) -> None:
        if err is not None:
            logger.error("Kafka delivery failed: %s", err)
            return

        key = msg.key().decode("utf-8") if msg.key() else None
        logger.info(
            "Kafka delivered: topic=%s partition=%s offset=%s key=%s",
            msg.topic(),
            msg.partition(),
            msg.offset(),
            key,
        )
