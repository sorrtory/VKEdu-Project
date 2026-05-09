# Services used in Broadboard

- MLIn = context updater service - reads Kafka topics, obtains context, and calls AI.

| Service | Description     | Input                                                                          | Output                       |
| ------- | --------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| MLIn    | Context updater | Kafka topic messages (conference events, document updates, whiteboard changes) | Put context (txt) into Redis |
| MLOut   |                 |                                                                                |                              |
| _TBD_   |                 |                                                                                |                              |
