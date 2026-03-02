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

# SPA + correct MIME for wasm/js
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Runtime config (e.g. TTS URL from HOST) written on container start
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
