# --- Stage 1: Build Client ---
FROM node:18-alpine AS client_builder
WORKDIR /app
# Copy everything to ensure context is captured
COPY . .
RUN cd client && npm install && npm run build

# --- Stage 2: Setup Server & Run ---
FROM node:18-slim
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Copy everything again
COPY . .

# Install server dependencies
RUN cd server && npm install --production

# Move built client assets to the correct location
# We need to make sure /app/client/dist exists for the server
RUN mkdir -p /app/client
COPY --from=client_builder /app/client/dist /app/client/dist

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "index.js"]
