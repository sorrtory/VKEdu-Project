# Postgres

We use `PrismaORM` as the driver for postgres. 


## Database schema

Refer to the [schema](../apps/backend/prisma/schema.prisma) for the current database design.

## Run

```bash
# Create a `.env` file in project root according to `.env.example`.
cp .env.example .env
# Launch postgres with docker compose
docker compose up -d postgres

# Change to backend app directory
cd apps/backend
# Check prisma configuration
yarn prisma validate
# Check database connection
yarn prisma db pull
# Create migration (set name to something meaningful, e.g. "init")
yarn prisma migrate dev --name init
# Generate prisma client
yarn prisma:generate
# Seed database
yarn prisma db seed
```

## Checks
```bash
# Check current database tables
docker compose exec postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
# List current database users
docker compose exec postgres sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM \"USER\";"'
```
