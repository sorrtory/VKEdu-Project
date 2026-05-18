import asyncio
import json
import logging
import os
import uuid

import openai
from livekit.agents import AutoSubscribe, JobContext
from livekit.rtc import DataPacket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

LLM_API_KEY = os.getenv("LLM_API_KEY", "your-api-key")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.vsellm.ru/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek/deepseek-v4-flash")

client = openai.AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

MAX_HISTORY = 10  # последних сообщений в истории диалога


async def entrypoint(ctx: JobContext):
    logger.info("🔗 Joining room %s...", ctx.room.name)
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
    logger.info("✅ Joined room %s.", ctx.room.name)

    agent_identity = ctx.agent.identity

    conversations: dict[str, list[dict[str, str]]] = {}

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
            await ctx.room.local_participant.publish_data(payload, topic="agent-response")
            logger.info("📤 AGENT RESPONSE SENT: %s", response_text)
        except Exception:
            logger.exception("Failed to send response to chat")

    async def generate_llm_response(history: list[dict[str, str]]) -> str:
        """Обращение к LLM и получение ответа."""
        try:
            response = await client.chat.completions.create(
                model=LLM_MODEL,
                messages=history,
                temperature=0.7,
            )
            text = response.choices[0].message.content.strip()
            if not text:
                text = "Ответ не получен."
            return text
        except Exception:
            logger.exception("LLM generation failed")
            return "Извините, произошла ошибка."

    async def handle_chat_message(sender_identity: str, message: str):
        """Полная обработка входящего сообщения: история → LLM → ответ."""
        # 1. Обновляем историю
        if sender_identity not in conversations:
            conversations[sender_identity] = []

        conversations[sender_identity].append({"role": "user", "content": message})

        # Ограничиваем длину истории
        if len(conversations[sender_identity]) > MAX_HISTORY:
            conversations[sender_identity] = conversations[sender_identity][-MAX_HISTORY:]

        # 2. Генерируем ответ
        logger.info("🤖 Generating LLM response for %s", sender_identity)
        answer = await generate_llm_response(conversations[sender_identity])

        # 3. Добавляем ответ в историю
        conversations[sender_identity].append({"role": "assistant", "content": answer})
        if len(conversations[sender_identity]) > MAX_HISTORY:
            conversations[sender_identity] = conversations[sender_identity][-MAX_HISTORY:]

        # 4. Отправляем ответ в чат
        await send_response_to_chat(answer)

    @ctx.room.on("data_received")
    def on_data_received(dp: DataPacket):
        # Пропускаем свои ответы
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

        # Асинхронно обрабатываем сообщение
        asyncio.create_task(handle_chat_message(sender.identity if sender else "unknown", message))

    logger.info("⏳ Waiting for participants...")
    await asyncio.Event().wait()