#!/bin/bash

echo "=== Vercel Deployment Verification ==="
echo ""

# Check if vercel.json exists
if [ -f "vercel.json" ]; then
    echo "✅ vercel.json found"
    echo "Current configuration:"
    cat vercel.json | jq '.' 2>/dev/null || cat vercel.json
else
    echo "❌ vercel.json not found"
fi

echo ""
echo "=== Checking API structure ==="

# Check API directory
if [ -d "api" ]; then
    echo "✅ API directory exists"
    echo "API files:"
    find api -name "*.js" -type f | sort
else
    echo "❌ API directory not found"
fi

echo ""
echo "=== Checking public directory ==="

# Check public directory
if [ -d "public" ]; then
    echo "✅ Public directory exists"
    echo "HTML files:"
    find public -name "*.html" -type f | sort | head -10
else
    echo "❌ Public directory not found"
fi

echo ""
echo "=== Checking environment ==="

# Check for .env file
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "Environment variables (without values):"
    grep -E "^[A-Z_]+=" .env | cut -d'=' -f1 | sort
else
    echo "⚠️  .env file not found (may use Vercel environment variables)"
fi

echo ""
echo "=== Deployment readiness ==="

# Check package.json scripts
if [ -f "package.json" ]; then
    echo "Build command:"
    cat package.json | jq -r '.scripts."vercel-build"' 2>/dev/null || echo "Not found"
fi

echo ""
echo "=== Recommendations ==="
echo "1. Ensure VERCEL_TOKEN is valid in GitHub Secrets"
echo "2. Verify VERCEL_ORG_ID and VERCEL_PROJECT_ID match your Vercel project"
echo "3. Check Vercel dashboard for any deployment errors"
echo "4. Consider using 'vercel pull' to sync local environment"