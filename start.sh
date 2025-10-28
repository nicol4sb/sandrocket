#!/bin/bash

# Sand Rocket - Startup Script
# This script installs dependencies and starts the Sand Rocket application

echo "🚀 Starting Sand Rocket - Task Management App"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (version 14 or higher) first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version 14 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Create public directory if it doesn't exist
if [ ! -d "public" ]; then
    echo "📁 Creating public directory..."
    mkdir -p public
fi

# Set default port if not specified
PORT=${PORT:-3000}

echo ""
echo "🚀 Launching Sand Rocket server..."
echo "📱 The app will be available at: http://localhost:$PORT"
echo "🔑 Default password: rocket123"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start

