# Frontend Dockerfile - Vue 3 + Vite
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html .
COPY frontend/vite.config.ts .
COPY frontend/vite-env.d.ts .
COPY frontend/tsconfig.json .
COPY frontend/tailwind.config.ts .
COPY frontend/postcss.config.cjs .

# Build with Vite
ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=ws://localhost:3000

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

# Stage 2: Runtime (nginx for serving SPA)
FROM nginx:alpine

# Copy nginx config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
