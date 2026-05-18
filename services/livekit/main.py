from config import LIVEKIT_AGENT_NAME
from room_agent import entrypoint
from livekit.agents import WorkerOptions, WorkerType, cli


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name=LIVEKIT_AGENT_NAME,
        )
    )
