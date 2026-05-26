import json
import unittest

from kafka_payload import parse_kafka_json


class KafkaPayloadTest(unittest.TestCase):
    def test_parse_plain_payload(self):
        payload = {"roomId": "room-1", "text": "hello"}

        self.assertEqual(parse_kafka_json(json.dumps(payload)), payload)

    def test_parse_nest_payload_envelope(self):
        payload = {
            "pattern": "conference.summary.request",
            "data": {"room_id": "room-1"},
        }

        self.assertEqual(parse_kafka_json(json.dumps(payload)), {"room_id": "room-1"})

    def test_parse_nested_envelope(self):
        payload = {
            "pattern": "outer",
            "data": {
                "pattern": "inner",
                "data": {"roomId": "room-1", "text": "hello"},
            },
        }

        self.assertEqual(
            parse_kafka_json(json.dumps(payload)),
            {"roomId": "room-1", "text": "hello"},
        )


if __name__ == "__main__":
    unittest.main()
