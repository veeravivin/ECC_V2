#!/bin/bash

# 1. Start the App in Background
echo "🚀 Starting Ethical Career Compass..."
docker compose up -d --build

# 2. Wait for it to be ready
echo "⏳ Waiting for server to be ready on port 3001..."
while ! nc -z localhost 3001; do   
  sleep 1
done
echo "✅ App is running locally on port 3001!"

# 3. Start Tunnel
echo "🌍 exposing to the internet..."
echo "-----------------------------------------------------"
echo "📢 YOUR PUBLIC URL IS BELOW (Share this link):"
echo "-----------------------------------------------------"

# Use Cloudflare Tunnel (No password required, more stable)
npx -y cloudflared tunnel --url http://localhost:3001
