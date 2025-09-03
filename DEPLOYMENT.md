# CDP Console Docker Deployment

This directory contains Docker deployment scripts and configurations for the CDP Console application.

## Quick Start

### Option 1: Simple Docker Deployment

```bash
# Make script executable
chmod +x deploy.sh

# Deploy latest version to production
./deploy.sh

# Deploy specific version
./deploy.sh v1.2.3 production

# Deploy to staging environment
./deploy.sh main staging
```

### Option 2: Docker Compose Deployment

```bash
# Make script executable
chmod +x deploy-compose.sh

# Deploy with Docker Compose
./deploy-compose.sh

# Deploy specific version
./deploy-compose.sh v1.2.3 production
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:

- `ADMIN_API_URL`: Your admin API endpoint
- `NODE_ENV`: Environment (production/staging/development)
- `PORT`: Port to run the application (default: 3000)

Optional variables:

- `NEXT_PUBLIC_DEFAULT_API_ENDPOINT`: Default CDP API endpoint
- `NEXT_PUBLIC_DEFAULT_API_KEY`: Default CDP API key
- `NEXT_PUBLIC_GA_ID`: Google Analytics ID

## Deployment Scripts

### deploy.sh

Full-featured deployment script that:

- Clones repository from GitHub
- Builds Docker image with metadata
- Stops/removes existing containers
- Starts new container with health checks
- Provides deployment summary

Usage:

```bash
./deploy.sh [version] [environment]
```

### deploy-compose.sh

Docker Compose deployment script that:

- Uses docker-compose.yml for configuration
- Simpler container management
- Built-in health checks and restart policies

Usage:

```bash
./deploy-compose.sh [version] [environment]
```

## Manual Docker Commands

### Build Image

```bash
docker build -t cdp-console:latest .
```

### Run Container

```bash
docker run -d \
  --name cdp-console \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e ADMIN_API_URL=https://adminbackend.dev.hxcd.now.hclsoftware.cloud \
  cdp-console:latest
```

### Docker Compose

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart services
docker compose restart
```

## Management Commands

### Container Management

```bash
# View running containers
docker ps

# View logs
docker logs -f cdp-console

# Stop container
docker stop cdp-console

# Restart container
docker restart cdp-console

# Remove container
docker rm -f cdp-console
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi cdp-console:latest

# Clean up unused images
docker image prune
```

### Health Check

```bash
# Check application health
curl http://localhost:3000/

# View container health status
docker inspect cdp-console --format='{{.State.Health.Status}}'
```

## Troubleshooting

### Container Won't Start

1. Check logs: `docker logs cdp-console`
2. Verify environment variables
3. Check port conflicts: `netstat -tlnp | grep :3000`

### Build Failures

1. Ensure Docker has enough memory (4GB+ recommended)
2. Clear Docker cache: `docker builder prune`
3. Check Dockerfile syntax

### Network Issues

1. Verify firewall settings
2. Check if port is accessible: `curl http://localhost:3000`
3. Inspect container networking: `docker network ls`

## Production Deployment Checklist

- [ ] Configure environment variables in `.env.local`
- [ ] Set appropriate `ADMIN_API_URL`
- [ ] Configure reverse proxy (nginx/Apache) if needed
- [ ] Set up SSL certificates
- [ ] Configure log rotation
- [ ] Set up monitoring and alerts
- [ ] Test health checks
- [ ] Verify backup procedures

## Security Considerations

1. **Run as non-root user** (handled in Dockerfile)
2. **Use specific version tags** instead of `latest` in production
3. **Regularly update base images** for security patches
4. **Limit container resources** if needed:
   ```bash
   docker run --memory=512m --cpus=1 cdp-console:latest
   ```
5. **Use secrets management** for sensitive environment variables

## Monitoring

### Health Check Endpoint

The application provides a health check at the root path (`/`).

### Container Resources

```bash
# Monitor resource usage
docker stats cdp-console

# Check container details
docker inspect cdp-console
```

### Log Management

```bash
# Configure log rotation in docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```
