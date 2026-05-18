# Infrastructure

This file is about docker and docker-compose commands

## Running

Note that:

- vs code doesn't like compose profiles, so you need to use CLI
- by default docker-compose will see the `docker-compose.override.yml`

```bash
docker compose --profile infra up -d
```

Run the web app behind nginx:

```bash
docker compose --profile infra --profile web --profile livekit up -d
```

For a production-like build, pass production overrides to compose interpolation too.
`env_file` configures container runtime environment, but build args such as
`NEXT_PUBLIC_LIVEKIT_URL` are resolved by compose before containers start.

```bash
docker compose --env-file .env --env-file .env.production --profile infra --profile web --profile livekit up -d --build
```

Nginx routes:

- `/` -> frontend
- `/api/` -> backend, with `/api` stripped
- `/ws` -> backend Socket.IO gateway
- `/rtc` -> LiveKit websocket endpoint, with `/rtc` stripped


## Run only kafka

```bash
docker compose up -d broker
```

Run ML services with their Redis and Kafka dependencies:

```bash
docker compose --profile ml up -d
```

## Environment

We use global environment variables for all services.

1. Root level `.env` with shared variables and secrets.
2. `.env.development` for development-specific variables (overrides root level). E.g. `BACKEND_KAFKA_HOST=localhost`
3. `.env.production` for production-specific variables (overrides root level). E.g. `BACKEND_KAFKA_HOST=broker`



~~Per service `[service]/.env.local` (overrides root level).~~




## List of services

- Backend 
- Frontend
- MLIn
- MLOut
- LiveKit bot

Service Dockerfiles are kept in `infra/docker/`. Compose and CI use the
repository root as build context for app-owned images so Dockerfiles can copy
the needed files by repository-relative paths.
