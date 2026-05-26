import json
import unittest

from kafka_payload import parse_kafka_json


class KafkaPayloadTest(unittest.TestCase):
    def test_parse_plain_payload(self):
        payload = {"roomId": "room-1", "text": "hello"}

        self.assertEqual(parse_kafka_json(json.dumps(payload)), payload)

    def test_parse_nest_payload_envelope(self):
        payload = {
            "pattern": "conference.chat",
            "data": {"roomId": "room-1", "text": "hello"},
        }

        self.assertEqual(
            parse_kafka_json(json.dumps(payload)),
            {"roomId": "room-1", "text": "hello"},
        )

    def test_parse_nest_payload_with_string_data(self):
        payload = {
            "pattern": "conference.summary.request",
            "data": json.dumps({"room_id": "room-1"}),
        }

        self.assertEqual(parse_kafka_json(json.dumps(payload)), {"room_id": "room-1"})


if __name__ == "__main__":
    unittest.main()
