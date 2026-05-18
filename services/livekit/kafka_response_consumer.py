import asyncio
import json
import logging
from typing import Optional

from aiokafka import AIOKafkaConsumer
from livekit.rtc import DataPacket

from config import KAFKA_BOOTSTRAP_SERVERS, KAFKA_CHAT_TOPIC

logger = logging.getLogger("livekit-agent.kafka-consumer")


class KafkaChatResponseConsumer:
    """Consume chat responses from Kafka and send them to the agent."""

    def __init__(self, room_name: str, agent_identity: str):
        self.room_name = room_name
        self.agent_identity = agent_identity
        self.consumer: Optional[AIOKafkaConsumer] = None
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    async def start(self, send_response_callback):
        """Start consuming responses from Kafka.

        Args:
            send_response_callback: async function(response_text) to send chat back to room
        """
        self.consumer = AIOKafkaConsumer(
            KAFKA_CHAT_TOPIC,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id=f"agent-response-consumer-{self.room_name}",
            auto_offset_reset="latest",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        )

        await self.consumer.start()
        logger.info(
            "Kafka response consumer started for room %s (broker: %s)",
            self.room_name,
            KAFKA_BOOTSTRAP_SERVERS,
        )

        self._task = asyncio.create_task(self._consume_loop(send_response_callback))

    async def _consume_loop(self, send_response_callback):
        """Main loop to consume and process responses."""
        try:
            async for message in self.consumer:
                if self._stop_event.is_set():
                    break

                event = message.value
                if not isinstance(event, dict):
                    continue

                # Only process responses from agent (type="chat_response")
                if event.get("type") != "chat_response":
                    continue

                # Make sure this is for the right room
                if event.get("room_name") != self.room_name:
                    continue

                response_text = event.get("text", "").strip()
                if not response_text:
                    continue

                logger.info(
                    "Processing chat response from Kafka: room=%s text=%s",
                    self.room_name,
                    response_text,
                )

                await send_response_callback(response_text)

        except asyncio.CancelledError:
            logger.info("Kafka response consumer cancelled")
        except Exception:
            logger.exception("Error in Kafka response consumer loop")
        finally:
            if self.consumer:
                await self.consumer.stop()

    async def stop(self):
        """Stop consuming responses."""
        self._stop_event.set()
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=5)
            except asyncio.TimeoutError:
                logger.warning("Kafka response consumer task did not stop gracefully")
                self._task.cancel()
