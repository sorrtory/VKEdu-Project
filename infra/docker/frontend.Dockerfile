FROM node:22-bookworm-slim AS builder

ARG NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
ARG NEXT_PUBLIC_LIVEKIT_ROOM=my-room
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_LIVEKIT_ROOM=$NEXT_PUBLIC_LIVEKIT_ROOM

WORKDIR /app

RUN npm install -g --force corepack@latest && corepack enable

COPY .yarn ./.yarn
COPY .pnp.cjs ./.pnp.cjs
COPY .pnp.loader.mjs ./.pnp.loader.mjs
COPY .env.example ./.env.example
COPY package.json yarn.lock ./
COPY apps/backend apps/backend
COPY apps/frontend apps/frontend

RUN yarn install --immutable

RUN yarn workspace frontend build

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g --force corepack@latest && corepack enable

COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/.pnp.cjs ./.pnp.cjs
COPY --from=builder /app/.pnp.loader.mjs ./.pnp.loader.mjs
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/apps/frontend ./apps/frontend

EXPOSE 3001

CMD ["yarn", "workspace", "frontend", "start"]
