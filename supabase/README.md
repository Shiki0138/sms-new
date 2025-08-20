# Supabase Setup Guide for SMS System

## Overview

This directory contains all the necessary files for setting up and migrating the SMS System to Supabase.

## Directory Structure

```
supabase/
├── migrations/          # SQL migration files
│   ├── 001_initial_schema.sql    # Core database schema
│   └── 002_rls_policies.sql      # Row Level Security policies
├── scripts/            # Utility scripts
│   └── migrate-to-supabase.js    # Data migration script
├── config/             # Configuration files
└── .env.example        # Environment variables template
```

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Note down your project URL and keys

### 2. Configure Environment Variables

```bash
cp supabase/.env.example .env
# Edit .env with your Supabase credentials
```

### 3. Run Database Migrations

#### Option A: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### Option B: Using SQL Editor

1. Go to your Supabase project's SQL Editor
2. Copy and paste the contents of each migration file in order:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
3. Execute each script

### 4. Migrate Existing Data

```bash
# Set environment variables
export SUPABASE_URL=your-project-url
export SUPABASE_SERVICE_KEY=your-service-key

# Run migration script
node supabase/scripts/migrate-to-supabase.js
```

## Database Schema

### Core Tables

- **users** - System users (admin, manager, staff)
- **subscriptions** - Subscription plans and status
- **settings** - Business settings per tenant
- **customers** - Customer information
- **staff** - Staff members
- **services** - Services/menu items
- **appointments** - Appointment bookings
- **sales** - Sales transactions
- **messages** - SMS message history
- **campaigns** - SMS campaigns
- **message_templates** - Reusable message templates

### Security Features

- Row Level Security (RLS) enabled on all tables
- Tenant isolation based on user_id
- Role-based access control (admin, manager, staff)
- Service role bypass for administrative tasks

### Plan Limits

The system enforces plan-based limits:

- **Light Plan**: 100 customers, 500 messages/month, 3 staff
- **Standard Plan**: 1000 customers, 5000 messages/month, 10 staff
- **Premium Plan**: Unlimited

## API Integration

### Using Supabase Client

```javascript
const { db, auth } = require('./src/config/database');

// Authentication
const { data, error } = await auth.signIn(email, password);

// Database queries
const customers = await db.getTenantTable('customers').select();
const newCustomer = await db.getTenantTable('customers').insert({ name, phone });
```

### Real-time Subscriptions

```javascript
const subscription = db.subscribe('messages', 
  { status: 'pending' }, 
  (payload) => {
    console.log('New message:', payload);
  }
);
```

## Rollback Instructions

If migration fails, you can rollback:

```bash
node supabase/scripts/migrate-to-supabase.js --rollback
```

Or manually in SQL Editor:

```sql
-- Drop all tables (in reverse order)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
-- ... continue for all tables
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Verify SUPABASE_URL and keys are correct
   - Check if user exists in Supabase Auth

2. **RLS Policy Violations**
   - Ensure user is authenticated
   - Check user role and permissions
   - Verify tenant isolation is working

3. **Migration Failures**
   - Check migration logs in `logs/migration.log`
   - Verify source data format
   - Run with `--dry-run` flag first

### Debug Mode

Enable debug logging:

```javascript
const { config } = require('./src/config/database');
config.database.headers['x-debug'] = 'true';
```

## Monitoring

### Database Metrics

Monitor in Supabase Dashboard:
- Database size
- Connection pool usage
- Query performance
- Real-time subscriptions

### Application Logs

Check application logs:
```bash
tail -f logs/sms-service.log
tail -f logs/migration.log
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Implement retry logic** for transient failures
3. **Use connection pooling** in production
4. **Monitor rate limits** and adjust as needed
5. **Regular backups** using Supabase's backup features
6. **Test RLS policies** thoroughly before production

## Support

- Supabase Documentation: https://supabase.com/docs
- Project Issues: [Create an issue in the repository]
- Supabase Discord: https://discord.supabase.com