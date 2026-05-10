from livekit.agents import JobContext


async def resolve_room_id(ctx: JobContext) -> str:
    try:
        return await ctx.room.sid
    except Exception:
        return ctx.room.name


def get_room_name(ctx: JobContext) -> str:
    return ctx.room.name


def get_participant_id(participant) -> str | None:
    if participant is None:
        return None

    return getattr(participant, "sid", None)


def get_participant_identity(participant) -> str | None:
    if participant is None:
        return None

    return getattr(participant, "identity", None)
