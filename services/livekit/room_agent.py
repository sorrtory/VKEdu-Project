import json
import logging

from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    ConversationItemAddedEvent,
    JobContext,
    TurnHandlingOptions,
)
from livekit.agents.llm import ChatMessage
from livekit.agents.voice.room_io import RoomOptions
from livekit.plugins import silero
from livekit.rtc import DataPacket

from config import (
    LOG_LEVEL,
    SILENCE_DURATION,
    WHISPER_COMPUTE_TYPE,
    WHISPER_DEVICE,
    WHISPER_LANGUAGE,
    WHISPER_MODEL_SIZE,
)
from faster_whisper_stt import FasterWhisperSTT
from kafka_events import KafkaEventPublisher
from livekit_refs import (
    get_participant_id,
    get_participant_identity,
    get_room_name,
)

logger = logging.getLogger("livekit-agent")
logger.setLevel(LOG_LEVEL)


async def entrypoint(ctx: JobContext):
    logger.info("Joining room %s...", ctx.room.name)

    room_id = get_room_name(ctx)
    room_name = get_room_name(ctx)
    publisher = KafkaEventPublisher()
    room_speech_sequence = 0
    room_chat_sequence = 0
    seen_chat_ids: set[str] = set()
    participant_sessions: dict[str, AgentSession] = {}
    shared_stt = build_stt()

    @ctx.room.on("data_received")
    def on_data_received(dp: DataPacket):
        nonlocal room_chat_sequence

        data = parse_data_packet(dp)
        if data is None:
            return

        text = str(data.get("message") or "").strip()
        if not text:
            return

        chat_id = data.get("id")
        if chat_id and chat_id in seen_chat_ids:
            logger.info("Skipping duplicate chat message: chat_id=%s", chat_id)
            return

        if chat_id:
            seen_chat_ids.add(chat_id)

        room_chat_sequence += 1

        sender = getattr(dp, "participant", None)

        logger.info(
            "CHAT MESSAGE RECEIVED: topic=%s sequence=%s room_id=%s "
            "participant_identity=%s data=%s",
            dp.topic,
            room_chat_sequence,
            room_id,
            get_participant_identity(sender),
            data,
        )

        publisher.send_chat(
            text=text,
            room_id=room_id,
            room_name=room_name,
            participant_id=get_participant_id(sender),
            participant_identity=get_participant_identity(sender),
            sequence=room_chat_sequence,
            chat_id=chat_id,
            chat_timestamp=data.get("timestamp"),
            livekit_topic=dp.topic,
        )

    async def start_participant_session(
        participant_ctx: JobContext,
        participant,
    ) -> None:
        nonlocal room_speech_sequence

        if participant.identity in participant_sessions:
            logger.info(
                "Participant session already exists: participant_identity=%s",
                participant.identity,
            )
            return

        session_room_id = get_room_name(participant_ctx)
        logger.info("Starting participant session: %s", participant.identity)

        session = AgentSession(
            stt=shared_stt,
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
        participant_sessions[participant.identity] = session

        session.output.set_audio_enabled(False)

        last_partial = ""

        @session.on("user_input_transcribed")
        def on_user_input_transcribed(event):
            nonlocal last_partial, room_speech_sequence

            text = event.transcript.strip()
            if not text:
                return

            if event.is_final:
                room_speech_sequence += 1

                logger.info(
                    "FINAL SPEECH: sequence=%s room_id=%s participant_identity=%s text=%s",
                    room_speech_sequence,
                    session_room_id,
                    get_participant_identity(participant),
                    text,
                )

                last_partial = ""
                publisher.send_speech(
                    text=text,
                    room_id=session_room_id,
                    room_name=room_name,
                    participant_id=get_participant_id(participant),
                    participant_identity=get_participant_identity(participant),
                    sequence=room_speech_sequence,
                )
            elif text != last_partial:
                logger.info(
                    "CURRENT SPEECH: participant_identity=%s text=%s",
                    get_participant_identity(participant),
                    text,
                )
                last_partial = text

        @session.on("user_state_changed")
        def on_user_state_changed(event):
            logger.info(
                "User state changed: participant_identity=%s %s -> %s",
                get_participant_identity(participant),
                event.old_state,
                event.new_state,
            )

        @session.on("close")
        def on_close(event):
            participant_sessions.pop(participant.identity, None)
            logger.info(
                "AgentSession closed: participant_identity=%s",
                get_participant_identity(participant),
            )
            publisher.flush()

        @session.on("conversation_item_added")
        def on_conversation_item_added(event: ConversationItemAddedEvent):
            if isinstance(event.item, ChatMessage) and event.item.role == "user":
                logger.info(
                    "USER CONVERSATION ITEM ADDED: participant_identity=%s text=%s",
                    get_participant_identity(participant),
                    event.item.text_content,
                )

        @session.on("agent_speech_committed")
        def on_agent_speech_committed(event):
            logger.info(
                "AGENT RESPONSE: participant_identity=%s text=%s",
                get_participant_identity(participant),
                event.text.strip(),
            )

        try:
            await session.start(
                room=participant_ctx.room,
                room_options=RoomOptions(
                    participant_identity=participant.identity,
                    audio_output=False,
                    text_input=False,
                    text_output=False,
                ),
                record=False,
                agent=Agent(
                    instructions=(
                        "You are a transcription-only agent. "
                        "Listen to the user and transcribe Russian speech. "
                        "Do not respond with audio."
                    )
                ),
            )
        except Exception:
            participant_sessions.pop(participant.identity, None)
            logger.exception(
                "Participant session error: participant_identity=%s",
                get_participant_identity(participant),
            )

    ctx.add_participant_entrypoint(start_participant_session)

    try:
        await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)
        room_id = get_room_name(ctx)
        logger.info("Joined room %s.", ctx.room.name)
    except Exception:
        logger.exception("Room connection error")
    finally:
        publisher.flush()


def parse_data_packet(dp: DataPacket) -> dict | None:
    try:
        data = json.loads(dp.data)
    except Exception:
        logger.exception("Failed to decode LiveKit data packet")
        return None

    if not isinstance(data, dict):
        return None

    return data


def build_stt() -> FasterWhisperSTT:
    return FasterWhisperSTT(
        model_size=WHISPER_MODEL_SIZE,
        device=WHISPER_DEVICE,
        compute_type=WHISPER_COMPUTE_TYPE,
        language=WHISPER_LANGUAGE,
    )
