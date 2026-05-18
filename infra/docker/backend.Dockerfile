# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS base

RUN set -eux; \
    printf 'Acquire::Retries "5";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\nAcquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/99-network; \
    apt-get update -y; \
    apt-get install -y --no-install-recommends ca-certificates openssl; \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM base AS deps

COPY .yarnrc.yml yarn.lock ./
COPY package.json ./
COPY apps/backend/package.json ./apps/backend/

RUN yarn workspaces focus backend

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM base AS builder

COPY --from=deps /app/.yarnrc.yml /app/yarn.lock ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/apps/backend/package.json ./apps/backend/
COPY --from=deps /app/node_modules ./node_modules

COPY apps/backend ./apps/backend

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN yarn workspace backend run prebuild
RUN yarn workspace backend run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM base AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=deps    /app/node_modules                ./node_modules
COPY --from=builder /app/apps/backend/dist            ./dist
COPY --from=deps    /app/package.json                 ./
COPY --from=deps    /app/apps/backend/package.json    ./

USER nestjs
EXPOSE 3000

CMD ["node", "dist/main.js"]