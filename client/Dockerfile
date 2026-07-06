# ─── Client Production Dockerfile ───────────────────────────────────────────────
# Stage 1: Build React app
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build:unix

# Stage 2: Serve with Nginx
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
