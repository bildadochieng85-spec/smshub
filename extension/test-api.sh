#!/bin/bash
# Prime SMS Hub API Test Script
# Environment setup and test runner

set -e

echo "╔══════════════════════════════════════╗"
echo "║  Prime SMS Hub - API Test Script    ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check if API key is provided
if [ -z "$PRIME_API_KEY" ]; then
    echo "⚠️  PRIME_API_KEY environment variable not set"
    echo ""
    echo "Please set your API key:"
    echo "  export PRIME_API_KEY='your-internal-api-key'"
    echo ""
    echo "Get it from your Render service environment variables"
    exit 1
fi

# Default server URL
SERVER_URL="${SERVER_URL:-https://your-app-name.onrender.com/api}"

# Show current configuration
echo "📋 Configuration:"
echo "  Server URL: $SERVER_URL"
echo "  API Key:    ${PRIME_API_KEY:0:8}..."
echo ""

# Run the test script
if [ -z "$1" ]; then
    echo "Running: node test-api.js help"
    node test-api.js help
else
    echo "Running: node test-api.js $@"
    node test-api.js "$@"
fi
