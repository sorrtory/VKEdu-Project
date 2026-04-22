FROM python:3.10-slim

WORKDIR /app

RUN pip intsall --no-cache-dir livekit-agents
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

CMD ["python", "main.py", "start"]