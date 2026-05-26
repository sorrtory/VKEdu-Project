FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

COPY services/ml/MLin/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/ml/MLin/*.py .

CMD ["python", "main.py"]
