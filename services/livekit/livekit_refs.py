from livekit.agents import JobContext


def get_room_id(ctx: JobContext) -> str:
    return getattr(ctx.room, "sid", None) or ctx.room.name


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
