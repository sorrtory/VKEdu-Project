import logging
from confluent_kafka import Producer
import json
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    WorkerType,
    AgentSession,
    Agent,
    TurnHandlingOptions,
    ConversationItemAddedEvent
)
from livekit.agents.llm import ChatMessage
from livekit.plugins.openai import LLM as OpenAILLM
from livekit.plugins import silero, openai
from faster_whisper_stt import FasterWhisperSTT
import time


class LLMLogger:
    def __init__(self, base):
        self._base = base

    async def create_response(self, messages, **kwargs):
        logger.info("Sending to LLM:")
        for msg in messages:
            logger.info(f"  {msg.role}: {msg.text_content}")
        response = await self._base.create_response(messages, **kwargs)
        logger.info(f"LLM Response: {response.text}")
        return response

    def __getattr__(self, name):
        return getattr(self._base, name)

producer = Producer({'bootstrap.servers': 'broker:9092'})

def send_speech_event(text: str):
    try:
        message = json.dumps({"text": text, "timestamp": time.time()}, ensure_ascii=False)
        producer.produce('speechEvent', value=message.encode('utf-8'))
        producer.poll(0)
        logger.info(f"Sent to Kafka: {text}")
    except Exception as e:
        logger.error(f"Kafka produce failed: {e}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

SILENCE_DURATION = 0.5


async def entrypoint(ctx: JobContext):
    logger.info(f"Joining room {ctx.room.name}...")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    logger.info(f"Joined room {ctx.room.name}.")
    logger.info("Waiting for participant...")

    try:
        participant = await ctx.wait_for_participant()
    except RuntimeError:
        logger.exception("Room disconnected while waiting for participant")
        return

    logger.info(f"Participant joined: {participant.identity}")

    whisper_stt = FasterWhisperSTT(
        model_size="small",
        device="cpu",
        compute_type="int8",
        language="ru",
    )

    base_llm = openai.LLM.with_ollama(
        model="qwen2.5:0.5b",
        base_url="http://ollama:11434/v1",
        temperature=0.6,
    )

    qwen_llm = LLMLogger(base_llm)

    session = AgentSession(
        stt=whisper_stt,
        llm=qwen_llm,
        vad=silero.VAD.load(),
        turn_handling=TurnHandlingOptions(
            turn_detection="vad",
            endpointing={
                "mode": "fixed",
                "min_delay": SILENCE_DURATION,
                "max_delay": 3.0,
            },
        ),
    )

    session.output.set_audio_enabled(False)

    last_partial = ""

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event):
        nonlocal last_partial

        text = event.transcript.strip()
        if not text:
            return

        if event.is_final:
            logger.info(f"FINAL SPEECH: {text}")
            last_partial = ""
            send_speech_event(text) # -> kafka speechEvent
        elif text != last_partial:
            logger.info(f"… CURRENT SPEECH: {text}")
            last_partial = text

    @session.on("user_state_changed")
    def on_user_state_changed(event):
        logger.info(f"User state changed: {event.old_state} -> {event.new_state}")

    @session.on("close")
    def on_close(event):
        logger.info("AgentSession closed")

    @session.on("conversation_item_added")
    def on_conversation_item_added(event: ConversationItemAddedEvent):
        if isinstance(event.item, ChatMessage) and event.item.role == "user":
            text = event.item.text_content
            logger.info(f"USER CONVERSATION ITEM ADDED: {text}")

    @session.on("agent_speech_committed")
    def on_agent_speech_committed(event):
        logger.info(f"AGENT RESPONSE: {event.text.strip()}")

    logger.info("Starting AgentSession...")

    try:
        await session.start(
            room=ctx.room,
            agent=Agent(
                instructions=(
                    "You are a transcription-only agent. "
                    "Listen to the user and transcribe Russian speech. "
                    "Do not respond with audio."
                )
            ),
        )
    except Exception:
        logger.exception("Session error")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name="default-agent",
        )
    )