# Livekit

## Dictionary

- livekit server - main component that manages rooms, participants, and media routing
- livekit agent - conference participant that joins rooms, listens to events, and process them
- ingress - additional media to a room (obs stream)
- egress - outgoing media from a room (recordings, HTTP Live Streaming)

## Setup

- [Install CLI](https://docs.livekit.io/reference/developer-tools/livekit-cli/#setup)

## Create a room

```bash
export LIVEKIT_URL=ws://localhost:7880
export LIVEKIT_API_KEY=devkey
export LIVEKIT_API_SECRET='secret'

lk token create \
  --join \
  --room demo-room \
  --identity user-1 \
  --valid-for 24h
```

## Check

```bash
lk room list
lk egress list
lk egress list --room demo-room
```
