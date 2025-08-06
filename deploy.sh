#!/bin/bash

# Production Deployment Script for Salon Light Plan
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Check if required tools are installed
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed." >&2; exit 1; }

echo "✅ Prerequisites check passed"

# Set environment file
ENV_FILE=".env.${ENVIRONMENT}"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE not found"
    exit 1
fi

echo "✅ Using environment file: $ENV_FILE"

# Run tests before deployment
echo "🧪 Running tests..."
npm run lint
npm run build:check

echo "✅ Tests passed"

# Build production bundle
echo "🏗️ Building production bundle..."
npm run build

echo "✅ Build completed successfully"

# Check bundle size
BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
echo "📦 Bundle size: $BUNDLE_SIZE"

# Security check
echo "🔒 Running security audit..."
npm audit --audit-level high

echo "✅ Security audit passed"

# Docker build
echo "🐳 Building Docker image..."
docker build -t salon-light-plan:latest .

echo "✅ Docker image built"

# Optional: Run container for testing
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "🧪 Testing container locally..."
    docker run -d --name salon-test -p 8081:8080 salon-light-plan:latest
    
    # Wait for container to be ready
    sleep 5
    
    # Health check
    if curl -f http://localhost:8081/health > /dev/null 2>&1; then
        echo "✅ Container health check passed"
        docker stop salon-test
        docker rm salon-test
    else
        echo "❌ Container health check failed"
        docker stop salon-test
        docker rm salon-test
        exit 1
    fi
fi

echo "🎉 Deployment preparation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Push to your container registry: docker push your-registry/salon-light-plan:latest"
echo "2. Deploy to your production environment"
echo "3. Update environment variables in production"
echo "4. Run database migrations if needed"

# Optional: Auto-deploy to staging
if [ "$ENVIRONMENT" = "staging" ] && [ -n "$STAGING_DEPLOY_URL" ]; then
    echo "🚀 Auto-deploying to staging..."
    # Add your staging deployment commands here
fi