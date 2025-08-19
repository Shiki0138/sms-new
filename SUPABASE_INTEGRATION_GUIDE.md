# Supabase Integration Guide for SMS System

This guide explains how the SMS (Salon Management System) has been integrated with Supabase, replacing the previous local database setup.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Changes](#architecture-changes)
3. [Setup Instructions](#setup-instructions)
4. [Key Components](#key-components)
5. [API Endpoints](#api-endpoints)
6. [Migration Guide](#migration-guide)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## 🌟 Overview

The SMS system has been fully integrated with Supabase, providing:

- **Managed PostgreSQL Database**: No need to manage your own database
- **Built-in Authentication**: Secure user authentication out of the box
- **Real-time Subscriptions**: Live updates for messages and reservations
- **Row Level Security**: Tenant isolation at the database level
- **File Storage**: For customer photos and documents
- **Auto-generated APIs**: REST and GraphQL endpoints

## 🏗️ Architecture Changes

### Before (Local Setup)
```
Frontend → Express API → Sequelize ORM → Local PostgreSQL
```

### After (Supabase Integration)
```
Frontend → Express API → Supabase Services → Supabase PostgreSQL
         ↓
    Supabase Auth
```

## 🚀 Setup Instructions

### 1. Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update with your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Database Migrations

Apply the migrations in your Supabase dashboard:

1. Go to SQL Editor in Supabase Dashboard
2. Run migrations in order from `salon-light-plan/supabase/migrations/`

### 4. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔧 Key Components

### 1. Supabase Client Configuration
**Location**: `/src/config/supabase/client.js`

Initializes Supabase client with authentication and helper functions.

### 2. Service Layer
**Location**: `/src/services/supabase/`

- `base.service.js` - Base class with common CRUD operations
- `user.service.js` - User management
- `customer.service.js` - Customer operations
- `reservation.service.js` - Appointment booking
- `message.service.js` - Messaging system
- `tenant.service.js` - Multi-tenant management
- `staff.service.js` - Staff management
- `service.service.js` - Service/treatment management

### 3. Authentication
**Location**: `/src/config/supabase/auth.js`

Handles:
- User registration with tenant creation
- Login/logout
- Password reset
- Email verification
- User invitations

### 4. Middleware
**Location**: `/src/middleware/supabase-auth.js`

- Token verification
- Role-based access control
- Tenant isolation
- Rate limiting

### 5. Routes
**Location**: `/src/routes/*-supabase.js`

Updated routes that use Supabase services:
- Authentication (`auth-supabase.js`)
- Customers (`customers-supabase.js`)
- Reservations (`reservations-supabase.js`)
- Dashboard (`dashboard-supabase.js`)
- Health checks (`health.js`)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user/tenant
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/search?q=term` - Search customers

### Reservations
- `GET /api/reservations` - List reservations
- `GET /api/reservations/:id` - Get reservation
- `POST /api/reservations` - Create reservation
- `PUT /api/reservations/:id` - Update reservation
- `POST /api/reservations/:id/cancel` - Cancel reservation
- `GET /api/reservations/available-slots` - Get available time slots

### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/supabase` - Supabase connection check
- `GET /api/health/detailed` - Detailed system health
- `POST /api/health/test-connection` - Test Supabase operations

## 🔄 Migration Guide

### Migrating Existing Data

1. **Backup your existing database**
   ```bash
   pg_dump -U postgres salon_lumiere > backup.sql
   ```

2. **Run the migration script**
   ```bash
   node scripts/migrate-to-supabase.js
   ```

3. **Verify data integrity**
   - Check customer counts
   - Verify reservation data
   - Test user logins

### Frontend Updates

Update the frontend to use the new Supabase client:

```javascript
// Old way
const api = new APIClient();

// New way
const api = window.supabaseClient;
```

Include the Supabase client script:
```html
<script src="/js/supabase-client.js"></script>
```

## 🧪 Testing

### 1. Test Supabase Connection

```bash
# Check health endpoint
curl http://localhost:3000/api/health/supabase

# Test connection
curl -X POST http://localhost:3000/api/health/test-connection
```

### 2. Test Authentication

```bash
# Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "fullName": "Test User",
    "tenantName": "Test Salon"
  }'

# Sign in
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### 3. Run Automated Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration
```

## 🔧 Troubleshooting

### Common Issues

1. **"Missing required Supabase environment variables"**
   - Ensure `.env` file exists with correct values
   - Check SUPABASE_URL and SUPABASE_ANON_KEY are set

2. **"Invalid token" errors**
   - Token may be expired, user needs to login again
   - Check if Supabase project is active

3. **"Permission denied" errors**
   - Check Row Level Security policies in Supabase
   - Ensure user has correct role

4. **Connection timeouts**
   - Verify Supabase project is not paused
   - Check network connectivity
   - Verify SUPABASE_URL is correct

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

Check Supabase logs:
1. Go to Supabase Dashboard
2. Navigate to Logs → API
3. Filter by timestamp and error level

## 🚀 Production Deployment

### Environment Variables
Ensure all production environment variables are set:
- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

### Security Checklist
- [ ] Enable Row Level Security on all tables
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting
- [ ] Enable SSL/TLS
- [ ] Set strong JWT secret
- [ ] Review and test RLS policies

### Performance Optimization
- Enable connection pooling in Supabase
- Use indexes for frequently queried columns
- Implement caching for static data
- Use batch operations for bulk updates

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## 🆘 Support

For issues specific to Supabase integration:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Supabase logs in the dashboard
3. Contact support with error details and logs