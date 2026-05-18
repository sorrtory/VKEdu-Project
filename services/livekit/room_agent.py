import asyncio
import json
import logging
import uuid

from livekit.agents import AutoSubscribe, JobContext
from livekit.rtc import DataPacket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

MOCK_RESPONSE = "Привет! Я агент. Это тестовый ответ."


async def entrypoint(ctx: JobContext):
    logger.info("🔗 Joining room %s...", ctx.room.name)
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
    logger.info("✅ Joined room %s.", ctx.room.name)

    agent_identity = ctx.agent.identity

    async def send_response_to_chat(response_text: str):
        """Отправка ответа в чат LiveKit."""
        try:
            response_data = {
                "message": response_text,
                "timestamp": int(asyncio.get_event_loop().time() * 1000),
                "from_agent": True,
                "id": str(uuid.uuid4()),
            }
            payload = json.dumps(response_data).encode("utf-8")
            data_packet = DataPacket(
                topic="agent-response",
                data=payload,
            )
            await ctx.room.local_participant.publish_data(data_packet)
            logger.info("📤 AGENT RESPONSE SENT: %s", response_text)
        except Exception:
            logger.exception("Failed to send response to chat")

    @ctx.room.on("data_received")
    def on_data_received(dp: DataPacket):
        # Пропускаем свои собственные ответы
        if dp.topic == "agent-response":
            return
        sender = getattr(dp, "participant", None)
        if sender and sender.identity == agent_identity:
            return

        try:
            data = json.loads(dp.data)
        except Exception:
            return
        if not isinstance(data, dict):
            return

        message = data.get("message", "").strip()
        if not message:
            return

        logger.info("💬 Chat message from %s: %s", sender.identity if sender else "?", message)

        # Отправляем мок‑ответ
        asyncio.create_task(send_response_to_chat(MOCK_RESPONSE))

    logger.info("⏳ Waiting for participants...")
    await asyncio.Event().wait()