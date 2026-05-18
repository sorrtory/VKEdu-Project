# Livekit

## Dictionary

- livekit server - main component that manages rooms, participants, and media routing
- livekit agent - conference participant that joins rooms, listens to events, and process them
- ingress - additional media to a room (obs stream)
- egress - outgoing media from a room (recordings, HTTP Live Streaming)

## Setup

- [Install CLI](https://docs.livekit.io/reference/developer-tools/livekit-cli/#setup)
- LiveKit API credentials live in the root `.env` file as `LIVEKIT_API_KEY`
  and `LIVEKIT_API_SECRET`. Docker Compose passes the same values to the
  LiveKit server, egress, backend, and agent.
- Docker Compose passes the effective LiveKit server config through
  `LIVEKIT_CONFIG`, so production values such as `LIVEKIT_RTC_USE_EXTERNAL_IP`
  and `LIVEKIT_TURN_*` are controlled from `.env` / `.env.production`.
- LiveKit media ports are configured through `LIVEKIT_CONFIG` in
  `docker-compose.yml`: publish `LIVEKIT_RTC_TCP_PORT` over TCP and the full
  `LIVEKIT_RTC_UDP_PORT_START`-`LIVEKIT_RTC_UDP_PORT_END` range over UDP.
  The default local range is `7881/tcp` and `8000-8010/udp`.

## Create a room

```bash
export LIVEKIT_URL=ws://localhost:7880
set -a
. ./.env
set +a

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
