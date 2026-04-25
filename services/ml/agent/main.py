import asyncio
import logging
import io
import wave
import struct
import math
import aiohttp
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, WorkerType
from livekit.rtc import AudioStream, AudioFrame

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

WHISPER_URL = "http://whisper:8000/transcribe"

# Параметры VAD
RMS_THRESHOLD = 500          # порог громкости
SILENCE_DURATION = 0.5       # секунд тишины после речи перед отправкой
SAMPLE_RATE = 16000          # ожидаемая частота дискретизации
NUM_CHANNELS = 1

async def entrypoint(ctx: JobContext):
    logger.info(f"🔗 Joining room {ctx.room.name}...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"✅ Joined room {ctx.room.name}.")

    agent_identity = ctx.agent.identity  # например, "default-agent"

    # Ждём первого участника, не являющегося агентом
    logger.info("⏳ Waiting for room creator (first participant)...")
    creator = None
    while True:
        participant = await ctx.wait_for_participant()
        if participant.identity != agent_identity:
            creator = participant
            break
    logger.info(f"👤 Creator identified: {creator.identity}")

    audio_track = None
    for pub in creator.tracks.values():
        if pub.track and pub.track.kind == "audio":
            audio_track = pub.track
            break

    if audio_track:
        logger.info("🎤 Creator already has an audio track, starting processing...")
        asyncio.create_task(process_audio_track(audio_track))
    else:
        logger.info("⏳ Waiting for creator's audio track...")
        def on_track_subscribed(track, publication, participant):
            if participant.identity == creator.identity and track.kind == "audio":
                logger.info(f"🎤 Audio track from creator arrived, starting processing...")
                asyncio.create_task(process_audio_track(track))
        ctx.room.on("track_subscribed", on_track_subscribed)

    await asyncio.Event().wait()


async def process_audio_track(track):
    """Читает аудиофреймы, нарезает по VAD и отправляет в Whisper."""
    stream = AudioStream(track, sample_rate=SAMPLE_RATE, num_channels=NUM_CHANNELS)

    frames = []
    speaking = False
    silence_frames = 0
    silence_threshold = int(SILENCE_DURATION * SAMPLE_RATE / 480)  # примерное количество фреймов при 480 сэмплах

    async for frame in stream:
        # frame.data — bytes (PCM 16-bit little-endian)
        pcm_data = frame.data
        rms = calculate_rms(pcm_data)

        if rms > RMS_THRESHOLD:
            if not speaking:
                speaking = True
                logger.debug("🔊 Speech started")
            frames.extend(pcm_data)
            silence_frames = 0
        else:
            if speaking:
                frames.extend(pcm_data)
                silence_frames += 1
                if silence_frames >= silence_threshold:
                    speaking = False
                    logger.debug("🤫 Speech ended, sending to whisper")
                    await send_to_whisper(bytes(frames))
                    frames.clear()
                    silence_frames = 0

    stream.close()


def calculate_rms(data: bytes) -> float:
    """Вычисляет RMS громкости 16-битного моно PCM."""
    count = len(data) // 2
    if count == 0:
        return 0.0
    fmt = f"<{count}h"
    samples = struct.unpack(fmt, data)
    sum_squares = sum(s * s for s in samples)
    return math.sqrt(sum_squares / count)


async def send_to_whisper(pcm: bytes):
    """Конвертирует PCM в WAV и отправляет в Whisper-сервис."""
    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wf:
        wf.setnchannels(NUM_CHANNELS)
        wf.setsampwidth(2)          # 16-bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)
    wav_bytes = wav_buffer.getvalue()

    logger.info(f"🔊 Sending audio segment ({len(wav_bytes)} bytes) to Whisper...")

    try:
        async with aiohttp.ClientSession() as session:
            data = aiohttp.FormData()
            data.add_field("file", wav_bytes, filename="audio.wav", content_type="audio/wav")
            async with session.post(WHISPER_URL, data=data) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    text = result.get("text", "").strip()
                    logger.info(f"📝 Recognized: {text}")
                else:
                    logger.error(f"Whisper error: {resp.status} {await resp.text()}")
    except Exception as e:
        logger.error(f"❌ Failed to send to Whisper: {e}")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name="default-agent",
        )
    )