import asyncio
import logging
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    WorkerType,
    AgentSession,
    TurnHandlingOptions,
)
from faster_whisper_stt import FasterWhisperSTT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

SILENCE_DURATION = 0.5 # сек

async def entrypoint(ctx: JobContext):
    logger.info(f"🔗 Joining room {ctx.room.name}...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"✅ Joined room {ctx.room.name}.")

    agent_identity = ctx.agent.identity

    logger.info("⏳ Waiting for room creator...")
    creator = None
    while True:
        try:
            participant = await ctx.wait_for_participant()
        except RuntimeError:
            logger.error("Room disconnected")
            return
        if participant.identity != agent_identity:
            creator = participant
            break
    logger.info(f"👤 Creator identified: {creator.identity}")

    whisper_stt = FasterWhisperSTT(
        model_size="small",
        device="cpu",
        compute_type="int8",
        language="ru"
    )

    session = AgentSession(
        stt=whisper_stt,
        turn_handling=TurnHandlingOptions(
            turn_detection="vad",
            endpointing={
                "mode": "fixed",
                "min_delay": SILENCE_DURATION,
                "max_delay": 3.0,
            },
        ),
    )

    @session.on("user_speech_committed")
    def on_user_speech_committed(msg):
        text = msg.text.strip()
        logger.info(f"📝 Recognized: {text}")

    logger.info("🎤 Starting AgentSession...")
    session_task = asyncio.create_task(
        session.start(room=ctx.room, participant=creator)
    )

    try:
        await session_task
    except Exception as e:
        logger.error(f"Session error: {e}")

    logger.info("Agent session finished.")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name="default-agent",
        )
    )