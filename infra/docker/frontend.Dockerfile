FROM node:22-slim AS builder

RUN corepack enable
WORKDIR /app

COPY .yarnrc.yml yarn.lock ./
COPY package.json ./
COPY apps/frontend/package.json ./apps/frontend/

RUN yarn workspaces focus frontend

COPY apps/frontend ./apps/frontend

ARG NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
ARG NEXT_PUBLIC_LIVEKIT_ROOM=my-room

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL
ENV NEXT_PUBLIC_LIVEKIT_ROOM=$NEXT_PUBLIC_LIVEKIT_ROOM

RUN yarn workspace frontend build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs
EXPOSE 3001

CMD ["node", "apps/frontend/server.js"]
