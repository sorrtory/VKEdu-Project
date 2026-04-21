FROM node:22-bookworm-slim AS builder

ARG NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
ARG NEXT_PUBLIC_LIVEKIT_ROOM=my-room
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_LIVEKIT_ROOM=$NEXT_PUBLIC_LIVEKIT_ROOM

# Устанавливаем corepack
RUN npm install -g --force corepack@latest && corepack enable

WORKDIR /app

# Копируем файлы конфигурации монорепозитория
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY .pnp.cjs ./.pnp.cjs
COPY .pnp.loader.mjs ./.pnp.loader.mjs

# Копируем package.json приложений (важно для Yarn workspaces)
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Устанавливаем зависимости
RUN yarn install --immutable

# Копируем исходный код
COPY .env.example ./.env.example
COPY apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend

# Собираем frontend
RUN yarn workspace frontend build

# Production stage
FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g --force corepack@latest && corepack enable

# Копируем необходимые файлы из билдера
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.pnp.cjs ./.pnp.cjs
COPY --from=builder /app/.pnp.loader.mjs ./.pnp.loader.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/yarn.lock ./yarn.lock

# Копируем собранный frontend и его зависимости
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder /app/apps/frontend/next.config.ts ./apps/frontend/ 2>/dev/null || true

# Копируем node_modules (нужны для работы Next.js)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

# Запускаем из правильной директории
WORKDIR /app/apps/frontend

CMD ["yarn", "start"]