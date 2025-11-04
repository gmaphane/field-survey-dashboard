#!/bin/bash

echo "=========================================="
echo "🚀 Field Survey Dashboard"
echo "=========================================="
echo ""
echo "Starting development server..."
echo "Dashboard will open at: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Open browser after short delay
sleep 3 && open "http://localhost:3000" &

# Start Next.js dev server
npm run dev
