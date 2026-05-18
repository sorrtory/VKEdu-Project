# FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# WORKDIR /app

# RUN apt-get update && apt-get install -y --no-install-recommends \
#     libgomp1 \
#     && rm -rf /var/lib/apt/lists/*

# COPY services/livekit/pyproject.toml services/livekit/uv.lock ./
# RUN uv sync --frozen --no-dev

# COPY services/livekit/*.py ./

# CMD ["uv", "run", "--frozen", "main.py", "start"]


FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim
WORKDIR /app
RUN pip install --no-cache-dir livekit-agents
COPY services/livekit/room_agent.py .
CMD ["python", "room_agent.py", "start"]