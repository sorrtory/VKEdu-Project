FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g --force corepack@latest && corepack enable

COPY .yarn ./.yarn
COPY .pnp.cjs ./.pnp.cjs
COPY .pnp.loader.mjs ./.pnp.loader.mjs
COPY .env.example ./.env.example
COPY package.json yarn.lock ./
COPY apps/backend apps/backend
COPY apps/frontend/package.json apps/frontend/package.json

RUN yarn install --immutable

RUN yarn workspace apps/backend build

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g --force corepack@latest && corepack enable

COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.pnp.cjs ./.pnp.cjs
COPY --from=builder /app/.pnp.loader.mjs ./.pnp.loader.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/apps/backend ./apps/backend

EXPOSE 3000

CMD ["yarn", "workspace", "apps/backend", "start:prod"]
