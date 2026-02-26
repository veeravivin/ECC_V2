#!/bin/bash

# Function to kill all background processes on exit
cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p)
}
trap cleanup SIGINT SIGTERM EXIT

echo "Starting AI Engine..."
cd ai-engine
# Check if python or python3 is available
if command -v python &> /dev/null; then
    python main.py &
else
    python3 main.py &
fi
cd ..

echo "Starting Backend Server..."
cd server
npm run dev &
cd ..

echo "Starting Client..."
cd client
npm run dev &
cd ..

# Keep script running to maintain background processes
wait
