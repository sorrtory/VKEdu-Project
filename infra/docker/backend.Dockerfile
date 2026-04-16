# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-slim AS deps

RUN corepack enable
WORKDIR /app

COPY .yarnrc.yml yarn.lock ./
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/

RUN yarn workspaces focus --production backend

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN corepack enable
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY .yarnrc.yml yarn.lock ./
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/

RUN yarn workspaces focus backend

COPY apps/backend ./apps/backend

# Set a dummy DATABASE_URL for Prisma code generation
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN yarn workspace backend run prebuild

# Build the backend application
RUN yarn workspace backend run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:22-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# We use .env: NODE_ENV=production
# ENV NODE_ENV=production
# ENV PORT=3000

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

COPY --from=deps    /app/node_modules                              ./node_modules
COPY --from=builder /app/apps/backend/dist                        ./dist
# for migrations? We do that from prisma cli on the host
# COPY                apps/backend/prisma                           ./prisma
COPY --from=deps    /app/package.json                             ./
COPY --from=deps    /app/apps/backend/package.json                ./

USER nestjs
EXPOSE 3000
CMD ["node", "dist/main.js"]