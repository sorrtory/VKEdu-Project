FROM node:22-bookworm-slim AS builder

ARG NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
ARG NEXT_PUBLIC_LIVEKIT_ROOM=my-room
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_LIVEKIT_ROOM=$NEXT_PUBLIC_LIVEKIT_ROOM

#RUN npm install -g --force corepack@latest && corepack enable

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

RUN yarn install --no-immutable

COPY .env.example ./.env.example
COPY apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend

RUN yarn workspace bb-front build

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g --force corepack@latest && corepack enable

COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

# Копируем собранный frontend
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

WORKDIR /app/apps/frontend

CMD ["yarn", "workspace", "bb-front", "start"]