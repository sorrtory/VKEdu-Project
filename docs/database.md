# Postgres

We use `PrismaORM` as the driver for postgres. 


## Database schema

Refer to the [schema](../apps/backend/prisma/schema.prisma) for the current database design.
See [Prisma workflow](./prisma.md) for schema-change commands and local database sync.

Current MVP conference archive storage:

- `Conference.roomName` stores the stable LiveKit/socket room name (`conferenceName` in API requests).
- `ConferenceChat` is one-to-one with `Conference`; there is exactly one chat stream per conference.
- `ChatMessage` stores user chat messages, AI-directed chat requests, AI/system messages, and file cards.
- `ConferenceAttachment` stores S3-compatible object metadata. File uploads also create a `ChatMessage` with `kind=file`; clients should render it as a file card and call the backend download endpoint with `attachment.objectKey`.
- `TranscriptEntry` stores transcript chunks in conference order.
- `SummaryEntry` stores summary chunks in conference order.

## Run

```bash
# Create a `.env` file in project root according to `.env.example`.
cp .env.example .env
# Launch postgres with docker compose
docker compose up -d postgres

# Change to backend app directory
cd apps/backend
# Create migration (set name to something meaningful, e.g. "init")
# if you use modern yarn, you can use `yarn dlx` like `npx`
# for older yarn, remove `dlx` and install prisma
yarn dlx prisma migrate dev --name init
# Generate prisma client (broken? see yarn prebuild)
yarn dlx prisma generate
# Seed database
yarn dlx prisma db seed
```

## Checks
```bash
# Check current database tables
docker compose exec postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
# List current database users
docker compose exec postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM \"USER\";"'
```
