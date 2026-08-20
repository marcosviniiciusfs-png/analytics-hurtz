#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
source venv/bin/activate
python backend/main.py &
BACKEND_PID=$!
trap 'kill $BACKEND_PID 2>/dev/null || true' EXIT
cd overlay && npm start

