#!/bin/bash

# needs (sudo apt install inotify-tools)

# Path to your service-worker.js file
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

echo -e "${BLUE}== File Watcher Started ==${NC}"
echo -e "${YELLOW}Watching all files except: $SERVICE_WORKER_FILE | .git/ ${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Watch for file changes (suppress inotifywait setup messages)
while true; do
    inotifywait -e close_write -r . --exclude="$SERVICE_WORKER_FILE|.git/" -q
    echo -e "${YELLOW}File change detected → updating version...${NC}"
    update_version
    echo ""
done
