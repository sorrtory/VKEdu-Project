FROM node:22-bookworm-slim AS builder

WORKDIR /app

# 1. Кэшируем yarn install
COPY .yarn ./.yarn
COPY .pnp.cjs ./.pnp.cjs
COPY .pnp.loader.mjs ./.pnp.loader.mjs
COPY package.json yarn.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json   # если нужно для workspace

RUN yarn install --immutable

# 2. Копируем исходный код (меняется часто, но yarn install уже в кэше)
COPY apps/backend apps/backend

# 3. Собираем
RUN yarn workspace backend build



FROM node:22-bookworm-slim AS production

WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g --force corepack@latest && corepack enable

# Копируем только необходимое для запуска
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.pnp.cjs ./.pnp.cjs
COPY --from=builder /app/.pnp.loader.mjs ./.pnp.loader.mjs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3000

CMD ["yarn", "workspace", "backend", "start:prod"]