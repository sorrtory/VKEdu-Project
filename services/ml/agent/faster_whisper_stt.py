import io
import wave
import logging
from faster_whisper import WhisperModel
from livekit.agents import stt, utils

logger = logging.getLogger("faster-whisper-stt")

class FasterWhisperSTT(stt.STT):
    def __init__(self, model_size: str = "small", device: str = "cpu", compute_type: str = "int8", language: str | None = None):
        capabilities = stt.STTCapabilities(
            streaming=False,
            interim_results=False
        )
        super().__init__(capabilities=capabilities)
        self._model = WhisperModel(model_size, device=device, compute_type=compute_type)
        self._language = language
        logger.info(f"✅ Whisper model '{model_size}' loaded on {device.upper()} ({compute_type})")

    async def _recognize_impl(self, buffer: utils.AudioBuffer, *, language: str | None = None, conn_options=None):
        wav_bytes = self._buffer_to_wav(buffer)

        segments, info = self._model.transcribe(wav_bytes, beam_size=5, language=language or self._language)
        text = " ".join([seg.text for seg in segments])

        yield stt.SpeechEvent(type=stt.SpeechEventType.FINAL_TRANSCRIPT, text=text)

    def _buffer_to_wav(self, buffer: utils.AudioBuffer) -> bytes:
        with io.BytesIO() as wav_buffer:
            with wave.open(wav_buffer, "wb") as wf:
                wf.setnchannels(buffer.num_channels)
                wf.setsampwidth(2)
                wf.setframerate(buffer.sample_rate)
                wf.writeframes(buffer.data)
            return wav_buffer.getvalue()
