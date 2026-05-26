import json
from typing import Any


def parse_kafka_json(raw_msg: str) -> dict[str, Any]:
    payload = json.loads(raw_msg)
    return unwrap_kafka_payload(payload)


def unwrap_kafka_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}

    data = payload.get("data")
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = None

    if isinstance(data, dict) and (
        "pattern" in payload or "id" in payload or "headers" in payload
    ):
        return unwrap_kafka_payload(data)

    return payload
