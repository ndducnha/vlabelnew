# Vlabel Web (React + Vite). Build từ gốc monorepo.
FROM node:20-alpine AS build
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm install
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @vlabel/web

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
