FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

RUN pip install --no-cache-dir livekit-agents

COPY services/livekit/room_agent.py .
COPY services/livekit/main_test.py .

CMD ["python", "main_test.py", "start"]