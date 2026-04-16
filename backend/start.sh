#!/bin/bash
set -e

ollama serve &

echo "Waiting for Ollama to start..."
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done
echo "Ollama ready. Pulling llama3..."

ollama pull llama3

echo "Starting FastAPI..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 7860
