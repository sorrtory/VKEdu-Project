FROM node:20-alpine AS builder

ARG NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
ARG NEXT_PUBLIC_LIVEKIT_ROOM=my-room
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_LIVEKIT_ROOM=$NEXT_PUBLIC_LIVEKIT_ROOM

WORKDIR /app

COPY package.json yarn.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN yarn install --frozen-lockfile

COPY . .
RUN yarn workspace frontend build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/frontend ./apps/frontend

EXPOSE 3001

CMD ["yarn", "workspace", "frontend", "start"]
