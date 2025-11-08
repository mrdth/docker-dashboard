# T175: Multi-stage Dockerfile for backend production image
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY backend/src ./src
COPY backend/tsconfig.json .

# Build TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 --start-period=10s \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

# Expose port
EXPOSE 3000

# Use dumb-init to properly handle signals
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
