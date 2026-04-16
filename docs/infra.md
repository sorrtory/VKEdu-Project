# Infrastructure

This file is about docker and docker-compose commands

## Running

Note that:

- vs code doesn't like compose profiles, so you need to use CLI
- by default docker-compose will see the `docker-compose.override.yml`

```bash
docker compose --profile infra up -d
```

## Run only kafka

```bash
docker compose up -d broker
```

## Environment

We use global environment variables for all services.

1. Root level `.env` with shared variables and secrets.
2. Optional `.env.production` for production-specific variables (overrides root level). E.g. `BACKEND_KAFKA_HOST=broker`

## List of services

- Backend
- Frontend
- MLIn
- MLOut
- LiveKit bot
