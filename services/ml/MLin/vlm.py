import base64
import logging
import openai
from resources import LLM_API_KEY, LLM_BASE_URL, VLM_MODEL

logger = logging.getLogger("mlin.vlm")

client = openai.OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

def describe_image(base64_data: str) -> str:
    """Получает от  VLM текстовое описание картинки."""
    if not base64_data:
        return "[пустое изображение]"

    image_url = f"data:image/jpeg;base64,{base64_data}"

    try:
        response = client.chat.completions.create(
            model=VLM_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Опиши, что изображено на картинке, кратко, на русском языке. "
                                "Если есть текст, формулы или графики – перепиши их или опиши словами."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url},
                        },
                    ],
                }
            ],
            max_tokens=500,
            temperature=0.3,
        )
        content = response.choices[0].message.content
        return content.strip() if content else "[модель не вернула описание]"
    except Exception as e:
        logger.error("VLM request failed: %s", e)
        return "[ошибка при распознавании доски]"
