# Backend


We use modern `yarn`. See [log](./log.md#Yarn)
`ESNext` modules (not `nodenext`).
[ESM setup](https://www.prisma.io/docs/prisma-orm/quickstart/postgresql#3-configure-esm-support)

### Test /send endpoint:

Test /send endpoint:

change `input.png` to your image file path

```bash
curl -X POST http://localhost:3000/send \
  -F "file=@input.png" \
  -F "message=hello"
```

## Architecture

TODO: adjust the diagram to reflect the current state of the backend

```mermaid
flowchart LR
    client[Web / Mobile Client]

    subgraph gateway[API Gateway Service - NestJS]
        gatewayApi[REST API / Swagger]
        gatewayGuard[JWT guard / route protection]
        gatewayConference[Conference endpoints]
        gatewayDocs[Context and upload endpoints]
    end

    subgraph auth[Authentication Microservice]
        authApi[Auth handlers]
        authLogic[Login / Register / Refresh / Logout]
        authJwt[JWT access and refresh tokens]
        authStore[(PostgreSQL <br/> Users + RefreshTokens)]
    end

    kafka[(Kafka event bus)]
    ai[AI / ML services]
    livekit[LiveKit]

    client -->|HTTP / HTTPS| gatewayApi
    gatewayApi --> gatewayGuard
    gatewayApi --> gatewayConference
    gatewayApi --> gatewayDocs

    gatewayApi -->|/auth/*| authApi
    gatewayGuard -->|token validation| authApi

    authApi --> authLogic
    authLogic --> authJwt
    authLogic --> authStore

    gatewayConference -->|conference events| kafka
    gatewayDocs -->|context updates| kafka
    kafka --> ai
    gatewayConference --> livekit
```

Notes:

- Current MVP implementation keeps gateway and auth in one NestJS app under `apps/backend`.
- This schema shows the simplest next split: the API gateway exposes client-facing endpoints, and the auth service owns user lookup, password verification, JWT issuance, refresh rotation, and token revocation.
- Auth data maps to the current Prisma models: `User` and `RefreshToken`.

## Object Storage

Conference context files are stored through an S3-compatible backend. The MVP
uses AWS SDK v3, so the same code can work with AWS S3, RustFS, or another
S3-compatible service by changing environment variables.

Relevant endpoints:

```bash
curl -X POST http://localhost:3000/conference/my-room/upload \
  -F "file=@input.pdf"
```

The upload is stored in object storage, persisted in Postgres as a conference
attachment, and appended to the conference chat as a `kind=file` message. The
response includes `file.key`. Use it as the `file` query parameter to get a
temporary download URL when the user opens the file card:

```bash
curl "http://localhost:3000/conference/my-room/download?file=conferences/my-room/<object-key>"
```

Required environment variables are documented in `.env.example` under
`Object Storage`. `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` are shared by
the backend S3 client and the local RustFS service in compose. For local Docker
infra, the compose stack includes RustFS on ports `9000` (S3 API) and `9001`
(console). For a backend process on the host, use
`S3_ENDPOINT=http://localhost:9000`. For the backend container, `.env.production`
overrides it with `S3_ENDPOINT=http://rustfs:9000`.

## Conference Archive

The MVP exposes JSON history endpoints backed by Postgres:

```bash
curl http://localhost:3000/conference/my-room/chat
curl http://localhost:3000/conference/my-room/files
curl http://localhost:3000/conference/my-room/transcript
curl http://localhost:3000/conference/my-room/summary
```

`conferenceName` is treated as the stable `roomName` for conference archive
lookup.

The backend persists archive events from Kafka topics
`conference.chat.ai.response`, `conference.summary.response`,
and `conference.transcript`. Event payloads should include either
`conferenceName` or `roomId` plus `text`.
