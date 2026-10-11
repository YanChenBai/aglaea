FROM oven/bun:1.4.3-alpine AS build
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY apps/website/package.json apps/website/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/client/package.json packages/client/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
RUN bun run --cwd packages/shared build
RUN bun run --cwd packages/client build
RUN bun run --cwd apps/web build

FROM oven/bun:1.4.3-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV AGLAEA_STATIC_ROOT=/app/website
ENV PORT=8787

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/bun.lock ./bun.lock
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/web/dist ./website

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

EXPOSE 8787
CMD ["bun", "apps/server/src/index.ts"]
