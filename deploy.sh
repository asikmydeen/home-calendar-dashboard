#!/bin/bash
set -e
export NODE_ENV=production

echo "Building..."
bun run build

echo "Deploying..."
firebase deploy
