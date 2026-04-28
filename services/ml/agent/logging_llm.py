from livekit.plugins.openai import LLM as OpenAILLM
from livekit.agents.llm import LLMResponse

class LoggingLLM(OpenAILLM):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    async def create_response(self, messages, **kwargs):
        logger.info("Sending to LLM:")
        for msg in messages:
            logger.info(f"{msg.role}: {msg.text_content}")

        response = await super().create_response(messages, **kwargs)

        logger.info(f"LLM Response: {response.text}")
        return response