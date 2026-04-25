import asyncio
import logging
import wave
import tempfile
import os
from typing import Optional

import numpy as np
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

        self.language = language
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

        logger.info(
            f"✅ Whisper model '{model_size}' loaded on {device.upper()} ({compute_type})"
        )

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: NotGivenOr[str] = NOT_GIVEN,
        conn_options=None,
    ) -> stt.SpeechEvent:
        """
        IMPORTANT:
        This function must RETURN a SpeechEvent.
        Do not use `yield` here.
        """

        selected_language = self.language
        if language is not NOT_GIVEN:
            selected_language = language

        audio = utils.merge_frames(buffer)

        sample_rate = audio.sample_rate
        num_channels = audio.num_channels
        pcm_data = audio.data

        text = await asyncio.to_thread(
            self._transcribe_pcm,
            pcm_data,
            sample_rate,
            num_channels,
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

            segments, _info = self.model.transcribe(
                wav_path,
                language=language,
                beam_size=5,
                vad_filter=False,
            )

            text = " ".join(segment.text.strip() for segment in segments).strip()
            return text

        except Exception:
            logger.exception("Whisper transcription failed")
            return ""

        finally:
            try:
                os.remove(wav_path)
            except OSError:
                pass