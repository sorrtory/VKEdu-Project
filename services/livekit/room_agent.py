import asyncio
import json
import logging
import uuid

from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    ConversationItemAddedEvent,
    JobContext,
    TurnHandlingOptions,
)
from livekit.agents.llm import ChatMessage
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
# from kafka_response_consumer import KafkaChatResponseConsumer
from livekit_refs import (
    get_participant_id,
    get_participant_identity,
    get_room_name,
    resolve_room_id,
)

logger = logging.getLogger("livekit-agent")
logger.setLevel(LOG_LEVEL)


async def entrypoint(ctx: JobContext):
    logger.info("Joining room %s...", ctx.room.name)

    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

    logger.info("Joined room %s.", ctx.room.name)

    room_id = await resolve_room_id(ctx)
    room_name = get_room_name(ctx)
    agent_identity = ctx.agent.identity or "agent"
    # publisher = KafkaEventPublisher()
    
    # Start consuming chat responses from Kafka
    # response_consumer = KafkaChatResponseConsumer(room_name, agent_identity)
    
    room_speech_sequence = 0
    room_chat_sequence = 0
    seen_chat_ids: set[str] = set()

    async def send_response_to_chat(response_text: str):
        """Send agent response back to the chat."""
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
            logger.info("AGENT RESPONSE SENT TO CHAT: %s", response_text)
        except Exception:
            logger.exception("Failed to send response to chat")

    @ctx.room.on("data_received")
    def on_data_received(dp: DataPacket):
        nonlocal room_chat_sequence

        data = parse_data_packet(dp)
        if data is None:
            return
        
        if dp.topic == "agent-response":
            return
        sender = getattr(dp, "participant", None)
        if sender and get_participant_identity(sender) == agent_identity:
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

        mock_response = "Привет! Я агент. Это тестовый ответ."
        asyncio.create_task(send_response_to_chat(mock_response))

    logger.info("Waiting for participant...")

    try:
        participant = await ctx.wait_for_participant()
    except RuntimeError:
        logger.exception("Room disconnected while waiting for participant")
        return

    logger.info("Participant joined: %s", participant.identity)

    # Start consuming chat responses from Kafka
    # await response_consumer.start(send_response_to_chat)

    session = AgentSession(
        stt=build_stt(),
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
        nonlocal last_partial, room_speech_sequence

        text = event.transcript.strip()
        if not text:
            return

        if event.is_final:
            room_speech_sequence += 1

            logger.info(
                "FINAL SPEECH: sequence=%s room_id=%s participant_identity=%s text=%s",
                room_speech_sequence,
                room_id,
                get_participant_identity(participant),
                text,
            )

            last_partial = ""
            publisher.send_speech(
                text=text,
                room_id=room_id,
                room_name=room_name,
                participant_id=get_participant_id(participant),
                participant_identity=get_participant_identity(participant),
                sequence=room_speech_sequence,
            )
        elif text != last_partial:
            logger.info("CURRENT SPEECH: %s", text)
            last_partial = text

    @session.on("user_state_changed")
    def on_user_state_changed(event):
        logger.info("User state changed: %s -> %s", event.old_state, event.new_state)

    @session.on("close")
    def on_close(event):
        logger.info("AgentSession closed")
        publisher.flush()

    @session.on("conversation_item_added")
    def on_conversation_item_added(event: ConversationItemAddedEvent):
        if isinstance(event.item, ChatMessage) and event.item.role == "user":
            logger.info("USER CONVERSATION ITEM ADDED: %s", event.item.text_content)

    @session.on("agent_speech_committed")
    def on_agent_speech_committed(event):
        logger.info("AGENT RESPONSE: %s", event.text.strip())

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
    # finally:
        # publisher.flush()
        # await response_consumer.stop()


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
