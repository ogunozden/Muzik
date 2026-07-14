# Muzik — tek-node self-host imaji (ADR 0001 Karar 1; F9)
# Serverless degil; kalici disk (var/, output/, symb/) volume olarak baglanir.

# 1) Bagimliliklar
FROM node:26-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build (standalone cikti)
FROM node:26-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# 3) Runtime — yalin standalone
FROM node:26-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4015
# Runtime mutable durum ve pipeline artefactleri image disinda (volume):
ENV MUZIK_DB_PATH=/data/var/muzik.db

# Next standalone ciktisi: minimal server + gerekli node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Kalici veri dizinleri (compose'ta volume ile eslenir)
RUN mkdir -p /data/var /data/output && ln -s /data/var ./var && ln -s /data/output ./output

EXPOSE 4015
CMD ["node", "server.js"]
