FROM node:22-bookworm-slim AS builder

WORKDIR /app

#RUN npm install -g --force corepack@latest && corepack enable

ENV BACKEND_DATABASE_HOST=postgres \
    POSTGRES_PORT=5432 \
    POSTGRES_DB=BB_db \
    POSTGRES_USER=BB_user \
    POSTGRES_PASSWORD=BB_password \
    DATABASE_URL=postgresql://BB_user:BB_password@postgres:5432/BB_db?schema=public


COPY .yarn ./.yarn
COPY .pnp.cjs ./.pnp.cjs
COPY .pnp.loader.mjs ./.pnp.loader.mjs
COPY .env.example ./.env.example
COPY package.json yarn.lock ./
COPY apps/backend apps/backend
COPY apps/frontend/package.json apps/frontend/package.json


RUN yarn install --immutable

RUN yarn workspace backend build

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g --force corepack@latest && corepack enable


COPY --from=builder /app/.env.example ./.env.example
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json


COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.pnp.cjs ./.pnp.cjs
COPY --from=builder /app/.pnp.loader.mjs ./.pnp.loader.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/package.json /app/package.json


EXPOSE 3000

CMD ["yarn", "workspace", "backend", "start:prod"]