#!/bin/bash

# CDP Console Docker Deployment Script
# Usage: ./deploy.sh [version] [environment]
# Example: ./deploy.sh v1.2.3 production
# Example: ./deploy.sh main development

set -e  # Exit on any error

# Configuration
REPO_URL="https://github.com/HCL-CDP-TA/admin-console.git"
APP_NAME="cdp-console"
CONTAINER_NAME="${APP_NAME}"
IMAGE_NAME="${APP_NAME}"
BUILD_CONTEXT="/tmp/${APP_NAME}-build"
DEFAULT_VERSION="main"
DEFAULT_ENV="production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
VERSION=${1:-$DEFAULT_VERSION}
ENVIRONMENT=${2:-$DEFAULT_ENV}

log_info "Starting deployment of ${APP_NAME}"
log_info "Version: ${VERSION}"
log_info "Environment: ${ENVIRONMENT}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Function to cleanup build context
cleanup() {
    if [ -d "$BUILD_CONTEXT" ]; then
        log_info "Cleaning up build context..."
        rm -rf "$BUILD_CONTEXT"
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Stop and remove existing container if running
if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    log_info "Stopping existing container: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME"
fi

if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
    log_info "Removing existing container: $CONTAINER_NAME"
    docker rm "$CONTAINER_NAME"
fi

# Remove existing image to force rebuild
if docker images -q "$IMAGE_NAME" | grep -q .; then
    log_info "Removing existing image: $IMAGE_NAME"
    docker rmi "$IMAGE_NAME" || true
fi

# Create build context and clone repository
log_info "Preparing build context..."
mkdir -p "$BUILD_CONTEXT"
cd "$BUILD_CONTEXT"

log_info "Cloning repository from $REPO_URL"
git clone "$REPO_URL" .

# Checkout specific version/branch/tag
log_info "Checking out version: $VERSION"
git checkout "$VERSION"

# Get commit hash for tagging
COMMIT_HASH=$(git rev-parse --short HEAD)
IMAGE_TAG="${VERSION}-${COMMIT_HASH}"

log_info "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"

# Build the Docker image
docker build \
    --build-arg NODE_ENV="$ENVIRONMENT" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VCS_REF="$COMMIT_HASH" \
    --build-arg VERSION="$VERSION" \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -t "${IMAGE_NAME}:latest" \
    .

log_success "Docker image built successfully"

# Determine port and environment variables based on environment
case "$ENVIRONMENT" in
    "production")
        PORT=3000
        NODE_ENV="production"
        ;;
    "staging")
        PORT=3001
        NODE_ENV="production"
        ;;
    "development")
        PORT=3002
        NODE_ENV="development"
        ;;
    *)
        PORT=3000
        NODE_ENV="production"
        ;;
esac

# Create and start new container
log_info "Starting new container on port $PORT"
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$PORT:3000" \
    -e NODE_ENV="$NODE_ENV" \
    -e PORT=3000 \
    --label "app=$APP_NAME" \
    --label "environment=$ENVIRONMENT" \
    --label "version=$VERSION" \
    --label "commit=$COMMIT_HASH" \
    "${IMAGE_NAME}:${IMAGE_TAG}"

# Wait for container to be ready
log_info "Waiting for application to start..."
sleep 5

# Health check
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f "http://localhost:$PORT" > /dev/null 2>&1; then
        log_success "Application is healthy and running on port $PORT"
        break
    else
        log_info "Waiting for application to be ready... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        sleep 2
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "Application failed to start properly"
    log_info "Container logs:"
    docker logs "$CONTAINER_NAME"
    exit 1
fi

# Display deployment information
log_success "Deployment completed successfully!"
echo
echo "=== Deployment Summary ==="
echo "Application: $APP_NAME"
echo "Version: $VERSION"
echo "Environment: $ENVIRONMENT"
echo "Commit: $COMMIT_HASH"
echo "Port: $PORT"
echo "Container: $CONTAINER_NAME"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "URL: http://localhost:$PORT"
echo
echo "=== Useful Commands ==="
echo "View logs: docker logs -f $CONTAINER_NAME"
echo "Stop container: docker stop $CONTAINER_NAME"
echo "Restart container: docker restart $CONTAINER_NAME"
echo "Remove container: docker rm -f $CONTAINER_NAME"
echo "Remove image: docker rmi ${IMAGE_NAME}:${IMAGE_TAG}"
echo

log_success "CDP Console is now running at http://localhost:$PORT"
