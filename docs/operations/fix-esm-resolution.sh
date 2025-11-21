#!/bin/bash
# Fix ESM module resolution issues in npm workspaces
# Run this script on your production server after npm install

set -e

REPO_ROOT="/home/sandrocket/sandrocket"
cd "$REPO_ROOT" || exit 1

echo "Removing any local node_modules in workspace packages..."
find packages -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
find apps -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true

echo "Verifying bcryptjs is in root node_modules..."
if [ ! -d "node_modules/bcryptjs" ]; then
    echo "ERROR: bcryptjs not found in root node_modules!"
    echo "Run: npm install"
    exit 1
fi

echo "Verifying no local node_modules exist..."
if find packages apps -type d -name node_modules 2>/dev/null | grep -q .; then
    echo "WARNING: Some local node_modules still exist"
    find packages apps -type d -name node_modules
else
    echo "✓ No local node_modules found (correct)"
fi

echo "Done! Dependencies should now resolve from root node_modules."

