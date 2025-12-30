#!/bin/bash

set -euo pipefail

if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required to run the local server."
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Clean up any leftover files from previous runs
rm -f "$PROJECT_DIR/custom_server.py" 2>/dev/null
rm -f "$PROJECT_DIR/prod_server.py" 2>/dev/null

PORT=8000

# Create a minimal custom server for service worker cache-busting
cat > "$PROJECT_DIR/prod_server.py" << 'EOF'
import http.server
import socketserver

class ProdHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Only disable caching for service worker to ensure updates are detected
        if self.path.endswith('service-worker.js'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Service-Worker-Allowed', '/')
        
        super().end_headers()

def run(port=8000):
    with socketserver.TCPServer(("", port), ProdHandler) as httpd:
        print(f"Serving at http://localhost:{port}")
        httpd.serve_forever()

if __name__ == "__main__":
    run()
EOF

echo "Starting production server on http://localhost:$PORT"
echo "Press Ctrl+C to stop"

cleanup() {
    echo -e "\nShutting down server..."
    kill $SERVER_PID 2>/dev/null || true
    rm -f "$PROJECT_DIR/prod_server.py"
    exit 0
}

trap cleanup SIGINT SIGTERM

python3 "$PROJECT_DIR/prod_server.py" &
SERVER_PID=$!

sleep 1

xdg-open "http://localhost:$PORT" 2>/dev/null || \
open "http://localhost:$PORT" 2>/dev/null || \
start "http://localhost:$PORT" 2>/dev/null || \
echo "Please open http://localhost:$PORT in your browser"

echo "Server running (PID: $SERVER_PID)"
wait $SERVER_PID