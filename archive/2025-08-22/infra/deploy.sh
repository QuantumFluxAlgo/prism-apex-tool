#!/bin/bash
set -e

echo "Deploying Prism Apex Tool..."
git pull origin main
docker-compose build
docker-compose up -d
echo "Deployment complete."
