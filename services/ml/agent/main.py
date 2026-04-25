import asyncio
import logging
import io
import wave
import struct
from typing import Optional
import aiohttp

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, WorkerType
from livekit.rtc import AudioStream, AudioFrame

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("livekit-agent")

RMS_THRESHOLD = 500      # # Порог RMS для определения речи
SILENCE_DURATION = 0.5   # секунд молчания перед завершением сегмента
SAMPLE_RATE = 16000
CHANNELS = 1

class WhisperTranscriber:
    def __init__(self, base_url: str = "http://whisper:8000"):
        self.base_url = base_url
        self._session: Optional[aiohttp.ClientSession] = None

    async def start(self):
        import aiohttp
        self._session = aiohttp.ClientSession()

    async def stop(self):
        if self._session:
            await self._session.close()

    async def transcribe(self, pcm_data: bytes) -> str:
        """Отправляет PCM аудио в whisper, возвращает распознанный текст."""
        # конвертируем PCM в WAV
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(pcm_data)
        wav_buffer.seek(0)

        # кидаем POST запрос
        form = aiohttp.FormData()
        form.add_field('file', wav_buffer, filename='audio.wav', content_type='audio/wav')
        async with self._session.post(f"{self.base_url}/transcribe", data=form) as resp:
            if resp.status == 200:
                result = await resp.json()
                return result.get("text", "")
            else:
                logger.error(f"Whisper error: {resp.status} {await resp.text()}")
                return ""

async def entrypoint(ctx: JobContext):
    logger.info(f"Joining room {ctx.room.name}...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"Joined room {ctx.room.name}.")

    creator_identity = None
    transcriber = WhisperTranscriber()
    await transcriber.start()

    active_track = None

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant):
        nonlocal creator_identity
        if not creator_identity and participant.identity != "default-agent":
            creator_identity = participant.identity
            logger.info(f"Creator detected: {creator_identity}")

        logger.info(f"Participant joined: {participant.identity}")

    @ctx.room.on("track_subscribed")
    async def on_track_subscribed(track, publication, participant):
        nonlocal active_track
        if track.kind != "audio":
            return
        if participant.identity != creator_identity:
            return

        logger.info(f"Audio track from creator {creator_identity}")
        if active_track:
            return
        active_track = track

        stream = AudioStream(track, sample_rate=SAMPLE_RATE, num_channels=CHANNELS)

        buffer = bytearray()
        silence_samples = 0
        max_silence_samples = int(SILENCE_DURATION * SAMPLE_RATE)  # кол-во сэмплов молчания

        async for frame in stream:
            # frame - AudioFrame, содержит PCM данные в bytes
            pcm_bytes = frame.data
            # Вычисляем RMS
            samples = struct.unpack_from(f"<{len(pcm_bytes)//2}h", pcm_bytes)
            if len(samples) == 0:
                continue
            squares = sum(s**2 for s in samples)
            rms = (squares / len(samples)) ** 0.5
            
            if rms > RMS_THRESHOLD:
                # Речь
                buffer.extend(pcm_bytes)
                silence_samples = 0
            else:
                # Тишина
                silence_samples += len(samples)
                if len(buffer) > 0:
                    buffer.extend(pcm_bytes)

                if len(buffer) > 0 and silence_samples >= max_silence_samples:
                    # Завершаем сегмент
                    logger.info(f"Sending audio segment of {len(buffer)} bytes to Whisper...")
                    text = await transcriber.transcribe(bytes(buffer))
                    if text.strip():
                        logger.info(f"Recognized: {text.strip()}")
                    else:
                        logger.info("No speech recognized.")
                    buffer = bytearray()
                    silence_samples = 0

        if len(buffer) > 0:
            logger.info(f"Sending final audio segment...")
            text = await transcriber.transcribe(bytes(buffer))
            if text.strip():
                logger.info(f"Final recognized: {text.strip()}")
        active_track = None

    await asyncio.Event().wait()

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
            agent_name="default-agent",
        )
    )
