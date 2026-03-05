# --- Stage 1: Build Client ---
FROM node:18-alpine AS client_builder

WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build


# --- Stage 2: Setup Server & Run ---
FROM node:18-slim

# Install system dependencies for sqlite3, python, and build tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package files and install
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy server source
COPY server/ ./server/

# Copy built client assets from Stage 1
# Server expects assets in /app/client/dist
COPY --from=client_builder /app/client/dist /app/client/dist

# Expose server port
EXPOSE 3000

# Start server
WORKDIR /app/server
CMD ["node", "index.js"]
