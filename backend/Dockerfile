# ISP Management – Backend
# Use Debian slim so Prisma engine gets libssl (Alpine lacks libssl.so.1.1 on OpenSSL 3)
FROM node:20-slim AS builder

WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push && npm run db:seed && node dist/index.js"]
