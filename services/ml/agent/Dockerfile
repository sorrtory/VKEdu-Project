FROM python:3.10-slim

WORKDIR /app

RUN pip install livekit-agents aiohttp

COPY main.py .

CMD ["python", "main.py", "start"]