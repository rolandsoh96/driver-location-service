#!/bin/sh

echo "🚀 NestJS Server URL: http://localhost:${PORT:-3000}"
echo "🍃 MongoDB URL: ${MONGODB_URI}"
echo "🗄️  Redis URL: ${REDIS_URL}"

# Execute the provided CMD from Dockerfile or docker-compose
exec "$@"
