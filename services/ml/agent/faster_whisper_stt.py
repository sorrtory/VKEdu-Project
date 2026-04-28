import asyncio
import logging
import os
import tempfile
import wave
from typing import Optional

from faster_whisper import WhisperModel

from livekit.agents import stt, utils
from livekit.agents.types import NOT_GIVEN, NotGivenOr
from livekit.agents.utils import AudioBuffer

logger = logging.getLogger("faster-whisper-stt")


class FasterWhisperSTT(stt.STT):
    def __init__(
        self,
        model_size: str = "small",
        device: str = "cpu",
        compute_type: str = "int8",
        language: Optional[str] = "ru",
    ):
        super().__init__(
            capabilities=stt.STTCapabilities(
                streaming=False,
                interim_results=False,
            )
        )

        self._language = language

        self._model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

        logger.info(
            "✅ Whisper model '%s' loaded on %s (%s)",
            model_size,
            device.upper(),
            compute_type,
        )

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options=None,
    ) -> stt.SpeechEvent:
        selected_language = self._language
        if language is not NOT_GIVEN:
            selected_language = language

        audio = utils.merge_frames(buffer)

        text = await asyncio.to_thread(
            self._transcribe_pcm,
            audio.data,
            audio.sample_rate,
            audio.num_channels,
            selected_language,
        )

        return stt.SpeechEvent(
            type=stt.SpeechEventType.FINAL_TRANSCRIPT,
            alternatives=[
                stt.SpeechData(
                    text=text,
                    language=selected_language or "",
                )
            ],
        )

    def _transcribe_pcm(
        self,
        pcm_data: bytes,
        sample_rate: int,
        num_channels: int,
        language: Optional[str],
    ) -> str:
        if not pcm_data:
            return ""

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = tmp.name

        try:
            with wave.open(wav_path, "wb") as wf:
                wf.setnchannels(num_channels)
                wf.setsampwidth(2)  # 16-bit PCM
                wf.setframerate(sample_rate)
                wf.writeframes(pcm_data)

            segments, _info = self._model.transcribe(
                wav_path,
                language=language,
                beam_size=5,
                vad_filter=False,
            )

            return " ".join(
                segment.text.strip()
                for segment in segments
                if segment.text.strip()
            ).strip()

        except Exception:
            logger.exception("Whisper transcription failed")
            return ""

        finally:
            try:
                os.remove(wav_path)
            except OSError:
                pass