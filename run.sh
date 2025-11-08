#!/bin/bash

# Strict error handling
set -euo pipefail

# Check for Python 3
if ! command -v python3 &> /dev/null
then
    echo "Error: Python 3 is required to run the local server."
    exit 1
fi

# Check for inotifywait if on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]] && ! command -v inotifywait &> /dev/null; then
    echo "Error: inotify-tools is required for file watching. Install with: sudo apt install inotify-tools"
    exit 1
fi

# Determine the absolute path of the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Service worker file path
SERVICE_WORKER_FILE="service-worker.js"

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to update the version number
update_version() {
    # Read the current version line
    CURRENT_LINE=$(grep 'CACHE_VERSION = ' "$SERVICE_WORKER_FILE")

    if [ -z "$CURRENT_LINE" ]; then
        echo -e "${RED}ERROR: Could not find CACHE_VERSION in service worker file${NC}"
        return 1
    fi

    # Extract just the number after the decimal point
    DECIMAL_PART=$(echo "$CURRENT_LINE" | grep -o -E '0\.([0-9]+)' | cut -d'.' -f2)

    if [ -z "$DECIMAL_PART" ]; then
        echo -e "${RED}ERROR: Could not extract decimal part${NC}"
        return 1
    fi

    # Increment it (force base 10 to avoid octal issues)
    NEW_DECIMAL_PART=$((10#$DECIMAL_PART + 1))

    # Pad with leading zeros to match original length
    ORIGINAL_LENGTH=${#DECIMAL_PART}
    NEW_DECIMAL_PART=$(printf "%0${ORIGINAL_LENGTH}d" "$NEW_DECIMAL_PART")

    # Replace the old line with the new one
    sed -i "s/0\.$DECIMAL_PART/0.$NEW_DECIMAL_PART/" "$SERVICE_WORKER_FILE"

    echo -e "${GREEN}Version updated: 0.$DECIMAL_PART → 0.$NEW_DECIMAL_PART${NC}"
}

# Function to start file watcher
start_file_watcher() {
    echo -e "${BLUE}== File Watcher Started ==${NC}"
    echo -e "${YELLOW}Watching all files except: $SERVICE_WORKER_FILE | .git/ ${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop both server and watcher${NC}"
    echo ""

    # Watch for file changes (suppress inotifywait setup messages)
    while true; do
        inotifywait -e close_write -r . --exclude="$SERVICE_WORKER_FILE|.git/" -q
        echo -e "${YELLOW}File change detected → updating version...${NC}"
        update_version
        echo "Refresh the app"
        echo "http://localhost:8081"
    done
}

# Create a custom Python server script
cat > "$PROJECT_DIR/custom_server.py" << 'EOF'
import http.server
import socketserver

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for all resources
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')

        # Add CORS headers for local development
        self.send_header('Access-Control-Allow-Origin', '*')

        # Handle Service Worker specific headers
        if self.path.endswith('service-worker.js'):
            self.send_header('Service-Worker-Allowed', '/')

        super().end_headers()

    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run(port=8081):
    with socketserver.TCPServer(("", port), CustomHandler) as httpd:
        print(f"Serving at http://localhost:{port}")
        httpd.serve_forever()

if __name__ == "__main__":
    run()
EOF

# Function to clean up
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    echo "Stopping local server and file watcher..."
    kill $SERVER_PID 2>/dev/null || true
    kill $WATCHER_PID 2>/dev/null || true
    rm "$PROJECT_DIR/custom_server.py"
    exit 0
}

# Trap interrupts
trap cleanup SIGINT SIGTERM

# Start custom server
echo -e "${BLUE}Starting custom local server...${NC}"
python3 "$PROJECT_DIR/custom_server.py" &
SERVER_PID=$!

# Brief pause to ensure server starts
sleep 2

# Start file watcher in background
start_file_watcher &
WATCHER_PID=$!

# Open default browser
echo -e "${BLUE}Opening application in default browser...${NC}"
xdg-open "http://localhost:8081" 2>/dev/null || \
    open "http://localhost:8081" 2>/dev/null || \
    start "http://localhost:8081" 2>/dev/null

echo -e "${GREEN}Development environment is running!${NC}"
echo -e "${YELLOW}Server PID: $SERVER_PID${NC}"
echo -e "${YELLOW}File watcher PID: $WATCHER_PID${NC}"
echo -e "${YELLOW}Both processes will be stopped when you press Ctrl+C${NC}"

# Wait for both processes
wait $SERVER_PID $WATCHER_PID