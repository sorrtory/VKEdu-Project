import asyncio
import logging
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, WorkerType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

async def entrypoint(ctx: JobContext):
    logger.info(f"🔗 Joining room {ctx.room.name}...")

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    logger.info(f"✅ Joined room {ctx.room.name}.")

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        logger.info(f"👤 Participant joined: {participant.identity}")

    await asyncio.Event().wait()

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name="default-agent",
        )
    )
