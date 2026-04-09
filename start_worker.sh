#!/bin/bash

# Script to start the Taskiq worker
# Usage: ./start_worker.sh [number_of_workers]

set -e

# Default to 4 workers if not specified
WORKERS=${1:-4}

cd "$(dirname "$0")"

# Activate virtual environment
source .venv/bin/activate

echo "Starting Taskiq worker with $WORKERS worker(s)..."
echo "Redis URL: ${TASKIQ_REDIS_URL:-redis://localhost:6379/0}"
echo ""

# Start the worker
# --workers: number of worker processes
# --fs-discover: auto-discover tasks from installed apps
exec taskiq worker core.broker:broker --workers "$WORKERS" --fs-discover
