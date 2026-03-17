# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json yarn.lock* ./
COPY prisma ./prisma/

# ── Dev stage ─────────────────────────────────────────────────────────────────
# Used by docker-compose. Installs all deps (including devDeps like tsx).
# Source is mounted as a volume so hot reload works.
FROM base AS dev
RUN yarn install --frozen-lockfile
EXPOSE 4050
CMD ["yarn", "dev"]

# ── Builder stage ─────────────────────────────────────────────────────────────
FROM base AS builder
RUN yarn install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && yarn build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma/
EXPOSE 4050
CMD ["node", "dist/index.js"]
