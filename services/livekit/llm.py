import logging

logger = logging.getLogger("livekit-agent.llm")


class DummyLLM:
    async def create_response(self, messages, **kwargs):
        logger.info("DummyLLM called - returning fixed reply")
        return type(
            "FakeResponse",
            (),
            {"text": "Привет! Это тестовый ответ от агента."},
        )()

    def __getattr__(self, name):
        return lambda *a, **kw: None


class LLMLogger:
    def __init__(self, base):
        self._base = base

    async def create_response(self, messages, **kwargs):
        logger.info("Sending to LLM:")
        for msg in messages:
            logger.info("  %s: %s", msg.role, msg.text_content)

        response = await self._base.create_response(messages, **kwargs)
        logger.info("LLM Response: %s", response.text)
        return response

    def __getattr__(self, name):
        return getattr(self._base, name)
