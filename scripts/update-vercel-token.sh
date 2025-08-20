#!/bin/bash

echo "🔧 Vercel Token Update Script"
echo "=============================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel@latest
fi

# Show current vercel version
echo "Vercel CLI Version: $(vercel --version)"

echo ""
echo "📋 Follow these steps to update your Vercel token:"
echo ""
echo "1. Visit: https://vercel.com/account/tokens"
echo "2. Click 'Create Token'"
echo "3. Name: 'github-actions-sms-new'"
echo "4. Scope: 'Full Account'"
echo "5. Copy the generated token"
echo ""

# Test current token if exists
if [ -n "$VERCEL_TOKEN" ]; then
    echo "Testing current token..."
    if vercel whoami 2>/dev/null; then
        echo "✅ Current token is valid"
        exit 0
    else
        echo "❌ Current token is invalid"
    fi
fi

echo ""
echo "6. Update GitHub Secrets:"
echo "   - Go to: https://github.com/Shiki0138/sms-new/settings/secrets/actions"
echo "   - Update VERCEL_TOKEN with your new token"
echo ""

echo "7. Verify your project settings:"
echo "   Run: vercel project ls"
echo "   Expected Project ID: prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc"
echo ""

echo "8. Test deployment:"
echo "   Run: vercel --prod"
echo ""

# Generate secure environment variables for production
echo "🔐 Recommended production environment variables:"
echo ""

# Generate JWT Secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "JWT_SECRET=$JWT_SECRET"
echo "SESSION_SECRET=$SESSION_SECRET"
echo "ADMIN_EMAIL=your-admin@yourdomain.com"
echo "ADMIN_PASSWORD=YourSecurePassword123!"
echo "ALLOWED_ORIGINS=https://your-domain.vercel.app"
echo ""

echo "Copy these to your Vercel project environment variables:"
echo "https://vercel.com/shiki0138/sms-new/settings/environment-variables"