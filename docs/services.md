# Services used in Broadboard

- MLIn = context updater service - reads Kafka topics, obtains context, and calls AI.

| Service       | Description                 | Input                                                                          | Output                       |
| ------------- | --------------------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| MLIn          | Context updater             | Kafka topic messages (conference events, document updates, whiteboard changes) | Put context (txt) into Redis |
| MLOut         | LLM processor               | Kafka topic messages (LLM requests)                                            | Put LLM responses into Kafka |
| Livekit Agent | Call speech / chat listener | LiveKit room events                                                            | Put transcripts into Kafka   |

## Livekit agent

UV basics

```bash
uv add httpx                   # Add runtime dep
uv add --dev pytest ruff       # Add dev dep
uv remove httpx                # Remove dep
uv sync                        # Install all deps from lockfile
uv sync --no-dev               # Production install only
```
