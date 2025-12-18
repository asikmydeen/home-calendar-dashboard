#!/bin/bash
set -e

echo "Building..."
bun run build

echo "Deploying..."
firebase deploy
