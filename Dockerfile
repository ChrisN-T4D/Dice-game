# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
# Root URL (e.g. Railway/nginx at /). Default `npm run build` uses /Dice-game/ for GitHub Pages.
RUN npm run build:site-root

# Production stage
FROM nginx:alpine

# For downloading audio assets at startup (optional AUDIO_ASSETS_URL)
RUN apk add --no-cache wget ca-certificates

# SPA template: entrypoint substitutes __NGINX_PORT__ from PORT (default 80; Railway sets PORT)
RUN mkdir -p /etc/nginx/templates
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built app (includes public/audio → dist if present in build context)
COPY --from=builder /app/dist /usr/share/nginx/html

# Runtime config (e.g. TTS URL from HOST) and optional audio download
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
