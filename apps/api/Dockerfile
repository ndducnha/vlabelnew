# Vlabel API (NestJS + Prisma). Build từ gốc monorepo.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm install
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @vlabel/shared \
 && npm run build -w @vlabel/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
WORKDIR /app/apps/api
EXPOSE 4000
# migrate + seed rồi start (seed idempotent nhờ upsert)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
