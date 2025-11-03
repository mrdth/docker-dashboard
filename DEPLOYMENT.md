# Deployment Guide - Docker Container Metrics Dashboard

Complete instructions for deploying the dashboard in Docker and production environments.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (for docker-compose method)
- Or: Node.js 20+ (for direct installation)

## Deployment Methods

### Method 1: Docker Compose (Recommended for Local/Testing)

Quickest way to run both backend and frontend in containers.

#### Setup

1. Clone repository:

```bash
git clone <repository-url>
cd docker-dashboard
```

2. Configure environment variables (optional):

Edit `docker-compose.yml` to set environment variables:

```yaml
environment:
  NODE_ENV: production
  LOG_LEVEL: info
  DOCKER_HOST: /var/run/docker.sock
  FRONTEND_URL: https://your-domain.com
```

3. Start services:

```bash
docker-compose up -d
```

Services start on:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

4. View logs:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

5. Stop services:

```bash
docker-compose down
```

### Method 2: Docker (Production)

Run individual containers with custom configuration.

#### Build Images

```bash
# Build backend image
docker build -f backend/Dockerfile -t dashboard-backend:latest .

# Build frontend image
docker build -f frontend/Dockerfile \
  --build-arg VITE_API_URL=http://localhost:3000 \
  --build-arg VITE_WS_URL=ws://localhost:3000 \
  -t dashboard-frontend:latest .
```

#### Run Backend Container

```bash
docker run -d \
  --name dashboard-backend \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -e DOCKER_HOST=/var/run/docker.sock \
  -e FRONTEND_URL=https://your-domain.com \
  --restart unless-stopped \
  dashboard-backend:latest
```

#### Run Frontend Container

```bash
docker run -d \
  --name dashboard-frontend \
  -p 80:80 \
  -e VITE_API_URL=https://api.your-domain.com \
  -e VITE_WS_URL=wss://api.your-domain.com \
  --restart unless-stopped \
  dashboard-frontend:latest
```

#### Environment Variables

**Backend**:
- `NODE_ENV` - "production" or "development"
- `LOG_LEVEL` - "debug", "info", "warn", or "error"
- `PORT` - Backend port (default: 3000)
- `DOCKER_HOST` - Docker socket path (default: /var/run/docker.sock)
- `FRONTEND_URL` - Frontend origin for CORS (required)

**Frontend**:
- `VITE_API_URL` - Backend API URL (e.g., http://localhost:3000)
- `VITE_WS_URL` - WebSocket URL (e.g., ws://localhost:3000)

### Method 3: Direct Installation (Development)

Run without Docker for development.

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev

# Or build and run production
npm run build
npm start
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev

# Or build and run production
npm run build
npm run preview
```

## Important: Docker Socket Access

The dashboard requires access to Docker daemon via socket. When running in Docker:

```bash
# Mount the Docker socket
-v /var/run/docker.sock:/var/run/docker.sock
```

**Security Note**: This gives the container access to Docker. In production, use least-privilege principles:
- Run container as non-root user
- Limit container capabilities
- Use Docker socket proxy if possible

## SSL/TLS Configuration

For HTTPS in production:

### Option 1: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://dashboard-frontend:80;
    }

    # Backend API
    location /api/ {
        proxy_pass http://dashboard-backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /api/metrics/stream {
        proxy_pass ws://dashboard-backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Let's Encrypt with Certbot

```bash
certbot certonly --standalone -d your-domain.com
# Copy certs to container volume
docker run -d \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  -p 443:443 \
  -p 80:80 \
  <reverse-proxy-image>
```

## Kubernetes Deployment

For Kubernetes deployment:

### ConfigMap for Environment

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-config
data:
  NODE_ENV: production
  LOG_LEVEL: info
  FRONTEND_URL: https://dashboard.example.com
```

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dashboard-backend
  template:
    metadata:
      labels:
        app: dashboard-backend
    spec:
      serviceAccountName: dashboard
      containers:
      - name: backend
        image: dashboard-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: dashboard-config
              key: NODE_ENV
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: dashboard-config
              key: LOG_LEVEL
        volumeMounts:
        - name: docker-socket
          mountPath: /var/run/docker.sock
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: docker-socket
        hostPath:
          path: /var/run/docker.sock
          type: Socket
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dashboard-backend
spec:
  selector:
    app: dashboard-backend
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
```

## Health Checks

Monitor dashboard health:

```bash
# Backend health
curl http://localhost:3000/health

# Frontend health
curl http://localhost/health
```

Both return 200 when healthy, 503 if Docker daemon unavailable.

## Monitoring

### Docker Stats

```bash
docker stats dashboard-backend dashboard-frontend
```

### View Logs

```bash
# Backend logs
docker logs -f dashboard-backend

# Frontend logs
docker logs -f dashboard-frontend

# With timestamps
docker logs -f --timestamps dashboard-backend
```

### Log Rotation

In docker-compose.yml:

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Backup & Recovery

### Volume Backup

If using named volumes for logs:

```bash
docker run --rm -v dashboard-logs:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/logs-backup.tar.gz -C /data .
```

### Container Recovery

If container crashes:

```bash
# Check logs for error
docker logs dashboard-backend

# Restart container
docker restart dashboard-backend

# If restart doesn't work, remove and recreate
docker rm -f dashboard-backend
docker-compose up -d backend
```

## Troubleshooting

### Docker Daemon Unavailable

**Error**: "Docker daemon is not available"

**Solutions**:
1. Verify Docker socket is mounted: `docker exec dashboard-backend ls -la /var/run/docker.sock`
2. Check Docker daemon running: `docker ps`
3. Verify permissions: Socket should be readable by container user

### High Memory Usage

**Symptoms**: Container memory usage grows over time

**Solutions**:
1. Reduce metrics collection frequency (default 10s)
2. Limit container count displayed (add pagination)
3. Check logs for memory leaks: `docker stats`

### WebSocket Connection Failures

**Symptoms**: Frontend shows "Real-time updates unavailable"

**Solutions**:
1. Verify WebSocket port open: `telnet localhost 3000`
2. Check CORS configuration in FRONTEND_URL env var
3. Review backend logs: `docker logs dashboard-backend`

### Slow API Responses

**Symptoms**: Dashboard loads slowly

**Solutions**:
1. Check Docker API response times: `LOG_LEVEL=debug docker logs dashboard-backend`
2. Verify Docker daemon health: `docker info`
3. Check system resources: `docker stats`

## Production Checklist

- [ ] Environment variables configured (FRONTEND_URL, LOG_LEVEL, etc)
- [ ] Docker socket properly mounted and accessible
- [ ] Health checks passing: `curl http://localhost:3000/health`
- [ ] CORS configured for frontend origin
- [ ] Logs monitored and rotated
- [ ] SSL/TLS enabled if exposing to network
- [ ] Container resource limits set
- [ ] Restart policy configured
- [ ] Backups tested
- [ ] Monitoring alerts configured

## Scaling

For high container counts (100+):

1. Enable pagination (T152)
2. Add caching layer
3. Consider separate metrics collector
4. Use database for metrics history (not in MVP)

## Support

For issues:
1. Check logs: `docker logs dashboard-backend`
2. Verify health: `curl http://localhost:3000/health`
3. Review deployment configuration
4. Check Docker daemon status

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for detailed documentation.
