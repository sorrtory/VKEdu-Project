# Frontend

## Run

### Development

```bash
yarn install
yarn workspace frontend dev
firefox localhost:3001
```

### Docker

```bash
docker compose --env-file .env --env-file .env.production --profile infra --profile web up --build frontend
docker compose --profile infra --profile web stop frontend
```