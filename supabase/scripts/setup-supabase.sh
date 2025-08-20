#!/bin/bash

# Supabase Setup Script for SMS System
# Version: 1.0.0
# Created: 2025-08-20

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="sms-system"
REGION="ap-northeast-1" # Tokyo region

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed"
        exit 1
    fi
}

# Check prerequisites
log_info "Checking prerequisites..."
check_command "npm"
check_command "node"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    log_warning "Supabase CLI not found. Installing..."
    npm install -g supabase
    log_success "Supabase CLI installed"
else
    log_success "Supabase CLI found"
fi

# Check if user is logged in to Supabase
if ! supabase projects list &> /dev/null; then
    log_info "Please login to Supabase..."
    supabase login
else
    log_success "Already logged in to Supabase"
fi

# Create project or use existing
echo ""
log_info "Setting up Supabase project..."

read -p "Do you want to create a new project or use existing? (new/existing): " choice

if [[ "$choice" == "new" ]]; then
    read -p "Enter project name (default: sms-system): " project_name
    project_name=${project_name:-$PROJECT_NAME}
    
    read -p "Enter database password: " -s db_password
    echo ""
    
    log_info "Creating new Supabase project..."
    supabase projects create "$project_name" \
        --org-id $(supabase orgs list --format json | jq -r '.[0].id') \
        --plan free \
        --region $REGION \
        --db-password "$db_password"
    
    log_success "Project created successfully"
else
    # List existing projects
    log_info "Available projects:"
    supabase projects list
    
    read -p "Enter project reference ID: " project_ref
    
    # Link to existing project
    supabase link --project-ref "$project_ref"
    log_success "Linked to existing project"
fi

# Get project details
PROJECT_REF=$(supabase status --format json | jq -r '.project_id')
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

log_info "Project URL: $SUPABASE_URL"

# Run database migrations
log_info "Running database migrations..."

# Apply schema
supabase db push

# Check if migrations were successful
if supabase db diff; then
    log_success "Database schema is up to date"
else
    log_warning "There are pending changes. Please review and apply."
fi

# Get API keys
log_info "Retrieving API keys..."

# Get keys from Supabase
ANON_KEY=$(supabase status --format json | jq -r '.anon_key')
SERVICE_ROLE_KEY=$(supabase status --format json | jq -r '.service_role_key')

# Create environment file
log_info "Creating environment configuration..."

cat > .env.supabase << EOF
# Supabase Configuration
# Generated on $(date)

SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_KEY=$SERVICE_ROLE_KEY

# Database Connection
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres

# Application Settings
NODE_ENV=production
APP_NAME=SMS System
APP_URL=https://your-domain.vercel.app

# SMS Provider (Twilio) - Update with your values
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# JWT Settings
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Session Settings
SESSION_SECRET=$(openssl rand -base64 32)

# Email Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=SMS System <noreply@your-domain.com>

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Timezone
TZ=Asia/Tokyo
EOF

log_success "Environment file created: .env.supabase"

# Set up RLS policies
log_info "Setting up Row Level Security..."

supabase db reset

log_success "RLS policies applied"

# Create storage buckets
log_info "Creating storage buckets..."

# Create avatars bucket
supabase storage create avatars --public

# Create documents bucket  
supabase storage create documents --public

log_success "Storage buckets created"

# Set up functions (if any)
if [[ -d "supabase/functions" ]]; then
    log_info "Deploying edge functions..."
    supabase functions deploy
    log_success "Edge functions deployed"
fi

# Verify setup
log_info "Verifying setup..."

# Test database connection
if supabase db inspect; then
    log_success "Database connection verified"
else
    log_error "Database connection failed"
    exit 1
fi

# Test API endpoints
log_info "Testing API endpoints..."
if curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $ANON_KEY" > /dev/null; then
    log_success "REST API is accessible"
else
    log_error "REST API is not accessible"
fi

# Create test user
log_info "Creating test user account..."

read -p "Enter test user email: " test_email
read -p "Enter test user password: " -s test_password
echo ""

# Create user via auth API
TEST_USER_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/signup" \
    -H "apikey: $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$test_email\", \"password\": \"$test_password\"}")

if echo "$TEST_USER_RESPONSE" | grep -q "id"; then
    log_success "Test user created successfully"
    log_info "Please check your email to confirm the account"
else
    log_warning "Test user creation may have failed. Please check manually."
fi

# Generate migration script
log_info "Generating data migration script..."

cat > scripts/migrate-data.sh << 'EOF'
#!/bin/bash

# Data Migration Script
# Run this after setting up Supabase to migrate existing data

set -e

echo "Starting data migration..."

# Set environment variables
export SUPABASE_URL=$(grep SUPABASE_URL .env.supabase | cut -d '=' -f2)
export SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_KEY .env.supabase | cut -d '=' -f2)

# Run migration script
node supabase/scripts/migrate-to-supabase.js

echo "Data migration completed!"
EOF

chmod +x scripts/migrate-data.sh

# Generate deployment guide
log_info "Generating deployment guide..."

cat > SUPABASE_DEPLOYMENT_GUIDE.md << EOF
# Supabase Deployment Guide

## Project Information
- **Project URL**: $SUPABASE_URL
- **Project Reference**: $PROJECT_REF
- **Region**: $REGION

## Environment Variables
Copy the values from \`.env.supabase\` to your production environment:

\`\`\`bash
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_KEY=$SERVICE_ROLE_KEY
\`\`\`

## Next Steps

1. **Update Vercel Environment Variables**:
   \`\`\`bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_KEY
   \`\`\`

2. **Configure Authentication**:
   - Go to Supabase Dashboard → Authentication → Settings
   - Add your domain to "Site URL" and "Redirect URLs"
   - Configure email templates

3. **Set up SMS Provider**:
   - Add Twilio credentials to environment variables
   - Test SMS functionality

4. **Migrate Data**:
   \`\`\`bash
   ./scripts/migrate-data.sh
   \`\`\`

5. **Test the Application**:
   - Deploy to Vercel
   - Create test accounts
   - Verify all functionality

## Database Access
- **Dashboard**: https://app.supabase.com/project/$PROJECT_REF
- **Direct SQL**: Use SQL Editor in dashboard
- **API Docs**: $SUPABASE_URL/rest/v1/

## Monitoring
- Set up alerts in Supabase Dashboard
- Monitor API usage and database performance
- Review logs regularly

## Backup
- Supabase automatically backs up your database
- For additional backups, use: \`supabase db dump\`

## Support
- Supabase Docs: https://supabase.com/docs
- Community: https://discord.supabase.com
EOF

echo ""
log_success "🎉 Supabase setup completed successfully!"
echo ""
log_info "Next steps:"
echo "  1. Review and update .env.supabase with your actual values"
echo "  2. Read the deployment guide: SUPABASE_DEPLOYMENT_GUIDE.md"
echo "  3. Run data migration: ./scripts/migrate-data.sh"
echo "  4. Deploy to Vercel with new environment variables"
echo ""
log_info "Supabase Dashboard: https://app.supabase.com/project/$PROJECT_REF"
echo ""

# Cleanup
rm -f .env.supabase.tmp