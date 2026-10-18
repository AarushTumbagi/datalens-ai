#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
echo "=================================================="
echo " Starting DataLens AI Analytical Platform"
echo "=================================================="

# Start backend in background
echo "1. Starting FastAPI Backend on http://localhost:8008..."
cd "$DIR/backend"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8008 --reload &
BACKEND_PID=$!

trap "kill $BACKEND_PID" EXIT

# Wait for backend
sleep 2

# Start frontend
echo "2. Starting Vite Frontend on http://localhost:5173..."
cd "$DIR"
npm run dev

wait $BACKEND_PID
