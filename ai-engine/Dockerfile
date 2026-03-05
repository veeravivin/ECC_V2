FROM python:3.10-slim

WORKDIR /app

# Install minimal build tools for Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from the ai-engine directory
COPY ai-engine/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the AI code
COPY . .

# If we are building from the root, we need to move into the ai-engine folder to find main.py
# Otherwise, we stay in /app
RUN if [ -d "ai-engine" ]; then mv ai-engine/* . && rm -rf ai-engine; fi

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
