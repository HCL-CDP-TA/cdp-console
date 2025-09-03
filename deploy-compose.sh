#!/bin/bash

# CDP Console Docker Compose Deployment Script
# Usage: ./deploy-compose.sh [version] [environment]
# Example: ./deploy-compose.sh v1.2.3 production

set -e

# Configuration
REPO_URL="https://github.com/HCL-CDP-TA/admin-console.git"
APP_NAME="cdp-console"
BUILD_CONTEXT="/tmp/${APP_NAME}-build"
DEFAULT_VERSION="main"
DEFAULT_ENV="production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
VERSION=${1:-$DEFAULT_VERSION}
ENVIRONMENT=${2:-$DEFAULT_ENV}

log_info "Starting Docker Compose deployment of ${APP_NAME}"
log_info "Version: ${VERSION}"
log_info "Environment: ${ENVIRONMENT}"

# Check Docker and Docker Compose
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
    exit 1
fi

if ! docker compose version > /dev/null 2>&1; then
    log_error "Docker Compose is not available"
    exit 1
fi

# Cleanup function
cleanup() {
    if [ -d "$BUILD_CONTEXT" ]; then
        log_info "Cleaning up build context..."
        rm -rf "$BUILD_CONTEXT"
    fi
}
trap cleanup EXIT

# Prepare build context
log_info "Preparing build context..."
mkdir -p "$BUILD_CONTEXT"
cd "$BUILD_CONTEXT"

log_info "Cloning repository..."
git clone "$REPO_URL" .
git checkout "$VERSION"

COMMIT_HASH=$(git rev-parse --short HEAD)
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Set environment variables for docker-compose
export VERSION="$VERSION"
export ENVIRONMENT="$ENVIRONMENT"
export BUILD_DATE="$BUILD_DATE"
export VCS_REF="$COMMIT_HASH"
export NODE_ENV="$ENVIRONMENT"

# Set port based on environment
case "$ENVIRONMENT" in
    "production") export PORT=3000 ;;
    "staging") export PORT=3001 ;;
    "development") export PORT=3002 ;;
    *) export PORT=3000 ;;
esac

# Stop existing services
log_info "Stopping existing services..."
docker compose down --remove-orphans || true

# Build and start services
log_info "Building and starting services..."
docker compose up -d --build

# Wait for service to be ready
log_info "Waiting for service to be ready..."
sleep 5

# Health check
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f "http://localhost:$PORT" > /dev/null 2>&1; then
        log_success "Application is healthy and running"
        break
    else
        log_info "Waiting... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        sleep 2
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Application failed to start"
    docker compose logs
    exit 1
fi

# Display information
log_success "Deployment completed!"
echo
echo "=== Deployment Summary ==="
echo "Version: $VERSION ($COMMIT_HASH)"
echo "Environment: $ENVIRONMENT"
echo "Port: $PORT"
echo "URL: http://localhost:$PORT"
echo
echo "=== Management Commands ==="
echo "View logs: docker compose logs -f"
echo "Stop: docker compose down"
echo "Restart: docker compose restart"
echo "Status: docker compose ps"
echo

log_success "CDP Console is running at http://localhost:$PORT"
