#!/bin/bash

set -e

# Ports used by the project
PORTS=(3000 27017 6379)

# Check for Docker and Docker Compose
if ! command -v docker &>/dev/null || ! command -v docker-compose &>/dev/null; then
  echo "Error: Docker and Docker Compose are required."
  exit 1
fi

# Function for full cleanup including image rebuild
full_cleanup() {
  echo -e "\n🧹 Cleaning up Docker environment..."

  # Stop and remove containers, networks, and volumes
  docker-compose down --remove-orphans -v || true

  # Kill any external process using project ports
  for PORT in "${PORTS[@]}"; do
    if command -v lsof &>/dev/null; then
      PORT_USERS=$(lsof -t -i:$PORT)
      if [ -n "$PORT_USERS" ]; then
        echo "🔥 Killing external processes on port $PORT..."
        kill -9 $PORT_USERS || true
      fi
    elif command -v netstat &>/dev/null; then
      # Windows-compatible netstat
      PID=$(netstat -aon | findstr :$PORT | awk '{print $5}' | head -n 1)
      if [ -n "$PID" ]; then
        echo "🔥 Killing process using port $PORT (PID: $PID)..."
        taskkill /PID $PID /F || true
      fi
    fi

    # Remove containers bound to port
    containers=$(docker ps -q --filter "publish=$PORT")
    if [ -n "$containers" ]; then
      echo "🔥 Removing Docker containers using port $PORT..."
      docker rm -f $containers || true
    fi
  done

  # Remove only project-specific images
  docker images -q driver-location-service_app | sort -u | xargs docker rmi -f || true

  # Run npm install to ensure dependencies are updated
  echo "📦 Running npm install to ensure dependencies..."
  npm install || true

  # Rebuild all containers
  docker-compose build --no-cache
}

# Function for instance cleanup only (no rebuild)
instance_cleanup() {
  echo -e "\n🧹 Cleaning up Docker instances only..."

  # Stop and remove containers, networks, and volumes
  docker-compose down --remove-orphans -v || true

  # Kill any external process using project ports
  for PORT in "${PORTS[@]}"; do
    if command -v lsof &>/dev/null; then
      PORT_USERS=$(lsof -t -i:$PORT)
      if [ -n "$PORT_USERS" ]; then
        echo "🔥 Killing external processes on port $PORT..."
        kill -9 $PORT_USERS || true
      fi
    elif command -v netstat &>/dev/null; then
      # Windows-compatible netstat
      PID=$(netstat -aon | findstr :$PORT | awk '{print $5}' | head -n 1)
      if [ -n "$PID" ]; then
        echo "🔥 Killing process using port $PORT (PID: $PID)..."
        taskkill /PID $PID /F || true
      fi
    fi

    # Remove containers bound to port
    containers=$(docker ps -q --filter "publish=$PORT")
    if [ -n "$containers" ]; then
      echo "🔥 Removing Docker containers using port $PORT..."
      docker rm -f $containers || true
    fi
  done

  echo "✅ Cleanup completed without rebuilding images."
}

# Handle Ctrl+C (SIGINT) - Only clean instances without rebuilding
trap 'echo -e "\n🛑 Caught interrupt. Stopping..."; instance_cleanup; exit 0' SIGINT

# Run in specific modes
if [ "$1" = "clean" ]; then
  full_cleanup
elif [ "$1" = "clean-instances" ]; then
  instance_cleanup
fi

echo "📦 Ensuring dependencies are installed..."
npm install || true

echo "🚀 Starting Docker Compose environment..."
docker-compose up