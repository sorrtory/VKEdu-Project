import logging

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    WorkerType,
    AgentSession,
    Agent,
    TurnHandlingOptions,
)

from livekit.plugins import silero
from faster_whisper_stt import FasterWhisperSTT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

SILENCE_DURATION = 0.5


async def entrypoint(ctx: JobContext):
    logger.info(f"🔗 Joining room {ctx.room.name}...")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    logger.info(f"✅ Joined room {ctx.room.name}.")
    logger.info("⏳ Waiting for participant...")

    try:
        participant = await ctx.wait_for_participant()
    except RuntimeError:
        logger.exception("Room disconnected while waiting for participant")
        return

    logger.info(f"👤 Participant joined: {participant.identity}")

    whisper_stt = FasterWhisperSTT(
        model_size="small",
        device="cpu",
        compute_type="int8",
        language="ru",
    )

    session = AgentSession(
        stt=whisper_stt,
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

    last_partial = ""

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event):
        nonlocal last_partial

        text = event.transcript.strip()
        if not text:
            return

        if event.is_final:
            logger.info(f"✅ FINAL SPEECH: {text}")
            last_partial = ""
        elif text != last_partial:
            logger.info(f"… CURRENT SPEECH: {text}")
            last_partial = text

    @session.on("user_state_changed")
    def on_user_state_changed(event):
        logger.info(f"👂 User state changed: {event.old_state} -> {event.new_state}")

    @session.on("close")
    def on_close(event):
        logger.info("🔚 AgentSession closed")

    logger.info("🎤 Starting AgentSession...")

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