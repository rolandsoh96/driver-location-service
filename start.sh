#!/bin/bash

set -e

if [ "$1" = "clean" ]; then
    echo "🧹 Completely cleaning up Docker environment..."

    # Stop and remove all docker-compose resources
    docker-compose down --remove-orphans

    # Stop and remove all containers using the Redis port (6379)
    REDIS_PORT=6379
    REDIS_CONTAINERS=$(docker ps -q --filter "publish=${REDIS_PORT}")
    if [ -n "$REDIS_CONTAINERS" ]; then
        echo "🔥 Stopping and removing containers using port ${REDIS_PORT}..."
        docker stop $REDIS_CONTAINERS
        docker rm $REDIS_CONTAINERS
    fi

    # Remove dangling and unused images
    docker image prune -af

    # Force rebuild all images without cache
    docker-compose build --no-cache
fi

echo "🚀 Starting Docker Compose environment..."
docker-compose up
