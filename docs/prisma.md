# Prisma

This project uses Prisma ORM for Postgres in `apps/backend`.

For the current MVP, the database is still a development database. We are not
working with real user data yet, so it is acceptable to reset or resync local
database state while the schema is actively changing.

## Quick Schema Change

Use this flow for MVP schema edits:

```bash
# 1. Edit the schema
$EDITOR apps/backend/prisma/schema.prisma

# 2. Format and validate Prisma schema
yarn workspace backend exec prisma format
yarn workspace backend exec prisma validate

# 3. Sync local Postgres to the current schema
yarn workspace backend exec prisma db push --force-reset

# 4. Regenerate Prisma client
yarn workspace backend exec prisma generate

# 5. Validate backend types and build
yarn workspace backend exec tsc --noEmit
yarn workspace backend build
```

## Files

- Prisma schema: `apps/backend/prisma/schema.prisma`
- Prisma config: `apps/backend/prisma.config.ts`
- Generated client: `apps/backend/src/generated/prisma`
- Seed script: `apps/backend/prisma/seed.ts`

## Change Schema

Edit:

```bash
apps/backend/prisma/schema.prisma
```

Then format and validate it:

```bash
yarn workspace backend exec prisma format
yarn workspace backend exec prisma validate
```

Regenerate the Prisma client after every schema change:

```bash
yarn workspace backend exec prisma generate
```

## Update Local Database State

For MVP development, prefer `db push` when we only need the local database to
match the current schema and do not need a durable migration history:

```bash
yarn workspace backend exec prisma db push
yarn workspace backend exec prisma db push --force-reset # drops all data, use with caution
yarn workspace backend exec prisma generate
```

If the local database state is disposable and gets out of sync, reset it:

```bash
yarn workspace backend exec prisma migrate reset
yarn workspace backend exec prisma generate
```

`migrate reset` drops and recreates the database, then runs migrations and seed
if configured. Use it only for local/dev data.

## Create a Migration

Use migrations when the schema change should be preserved as an explicit,
reviewable database evolution step:

```bash
yarn workspace backend exec prisma migrate dev --name <meaningful_name>
yarn workspace backend exec prisma generate
```

Before committing a migration, inspect the generated SQL:

```bash
sed -n '1,220p' apps/backend/prisma/migrations/<migration_name>/migration.sql
```

For this MVP, avoid creating migrations just to experiment with schema shape.
Prefer `prisma db push` until the model is stable enough to keep.

## Useful Checks

Check generated types and backend compilation:

```bash
yarn workspace backend exec tsc --noEmit
yarn workspace backend build
```

Check current tables:

```bash
docker compose exec postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
```

Inspect one table:

```bash
docker compose exec postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM \"CONFERENCE\" LIMIT 10;"'
```
