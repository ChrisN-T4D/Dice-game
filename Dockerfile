# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# For downloading audio assets at startup (optional AUDIO_ASSETS_URL)
RUN apk add --no-cache wget ca-certificates

# SPA + correct MIME for wasm/js
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder (no public/audio; use AUDIO_ASSETS_URL at runtime)
COPY --from=builder /app/dist /usr/share/nginx/html

# Runtime config (e.g. TTS URL from HOST) and optional audio download
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
