import asyncio
import logging
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    WorkerType,
)
from livekit.rtc import AudioStream
from livekit.agents.vad import VAD, VADEventType
from faster_whisper_stt import FasterWhisperSTT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

SAMPLE_RATE = 16000
NUM_CHANNELS = 1


async def entrypoint(ctx: JobContext):
    logger.info(f"🔗 Joining room {ctx.room.name}...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"✅ Joined room {ctx.room.name}.")

    agent_identity = ctx.agent.identity

    # Ждём создателя комнаты
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


    track_ready = asyncio.Event()
    audio_track = None

    def on_track_subscribed(track, publication, participant):
        nonlocal audio_track
        if participant.identity == creator.identity and track.kind == "audio":
            logger.info(f"🎤 Audio track from creator arrived")
            audio_track = track
            track_ready.set()

    ctx.room.on("track_subscribed", on_track_subscribed)

    try:
        await asyncio.wait_for(track_ready.wait(), timeout=30)
    except asyncio.TimeoutError:
        logger.error("❌ Timed out waiting for audio track")
        return

    if not audio_track:
        logger.error("❌ No audio track obtained")
        return

    # Загружаем Whisper STT (CPU, small, int8)
    whisper_stt = FasterWhisperSTT(
        model_size="small",
        device="cpu",
        compute_type="int8",
        language="ru"   # или None для автоопределения
    )

    # Запускаем обработку: VAD + отправка в Whisper
    logger.info("🎤 Starting audio processing with built-in VAD...")
    await process_with_vad(audio_track, whisper_stt)


async def process_with_vad(track, stt_plugin):
    stream = AudioStream(track, sample_rate=SAMPLE_RATE, num_channels=NUM_CHANNELS)
    vad = VAD()  # использует Silero VAD по умолчанию
    vad_stream = vad.stream()

    # Асинхронно читаем аудиофреймы и передаём в VAD
    async def audio_feeder():
        async for frame in stream:
            vad_stream.push_frame(frame)
        vad_stream.close()

    feeder_task = asyncio.create_task(audio_feeder())

    # Обрабатываем события VAD
    speech_buffer = bytearray()
    async for event in vad_stream:
        if event.type == VADEventType.START_OF_SPEECH:
            logger.debug("🔊 Speech started")
            speech_buffer.clear()
        elif event.type == VADEventType.INFERENCE_DONE:
            # Речевой сегмент закончен, отправляем в STT
            if speech_buffer:
                text = await transcribe_audio(bytes(speech_buffer), stt_plugin)
                if text:
                    logger.info(f"📝 Recognized: {text}")
                speech_buffer.clear()
        elif event.type == VADEventType.SPEAKING:
            # Просто накапливаем аудиоданные
            speech_buffer.extend(event.samples.data)

    await feeder_task
    stream.close()


async def transcribe_audio(pcm_data: bytes, stt_plugin) -> str:
    """
    Преобразует PCM в AudioBuffer, вызывает STT и возвращает текст.
    """
    from livekit.agents.utils import AudioBuffer

    buffer = AudioBuffer(
        data=pcm_data,
        sample_rate=SAMPLE_RATE,
        num_channels=NUM_CHANNELS,
        samples_per_channel=len(pcm_data) // (2 * NUM_CHANNELS),
    )
    async_gen = stt_plugin.recognize(buffer)
    async for ev in async_gen:
        if ev.type == stt_plugin.SpeechEventType.FINAL_TRANSCRIPT:
            return ev.text.strip()
    return ""


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name="default-agent",
        )
    )