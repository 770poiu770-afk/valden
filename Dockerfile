# Production image. On Railway, migrations run as the pre-deploy command (railway.json) and the
# start command comes from railway.json. Elsewhere, the CMD below migrates and then starts.
# The app runs as a non-root user; on Railway set RAILWAY_RUN_UID=0 when a volume is attached
# (Railway mounts volumes as root).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN useradd --system --uid 1001 valden && mkdir -p /app/uploads && chown valden /app/uploads
COPY --from=build --chown=valden /app ./
USER valden
EXPOSE 3000
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npx next start -H 0.0.0.0 -p ${PORT}"]
