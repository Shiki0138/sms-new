# Salon Lumière - SMS Management System

A comprehensive, enterprise-grade SMS management system for beauty salons with elegant UI/UX design, multi-provider support, advanced queuing, and real-time analytics.

[![Deploy Status](https://github.com/Shiki0138/sms-new/actions/workflows/deploy.yml/badge.svg)](https://github.com/Shiki0138/sms-new/actions)
[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://sms-new.vercel.app)

**Project ID**: `prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc`

## 🚀 Features

- **Multi-Provider Support**: Twilio, AWS SNS with extensible architecture
- **Advanced Queuing**: Redis-based with priority handling and retry logic
- **Multi-Tenant**: Isolated tenants with plan-based access control
- **Real-Time Analytics**: Comprehensive tracking and reporting
- **Security**: JWT authentication, rate limiting, and input validation
- **Scalability**: Horizontal scaling with load balancer support
- **Monitoring**: Health checks, metrics, and comprehensive logging

## 📋 Quick Start

### Prerequisites
- Node.js 18+ 
- Redis (for queuing)
- SMS Provider account (Twilio or AWS)

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd 017_SMS
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Redis** (using Docker)
   ```bash
   docker run -d --name sms-redis -p 6379:6379 redis:alpine
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Verify Installation**
   - Health: http://localhost:3001/health
   - API docs: http://localhost:3001/api

## 🔧 Configuration

### Required Environment Variables

```env
# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ADMIN_API_KEY=your-admin-api-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

See `.env.example` for complete configuration options.

## 📡 API Endpoints

### Send SMS
```http
POST /api/sms/send
Authorization: Bearer <jwt-token>
X-Tenant-ID: <tenant-id>

{
  "to": "+1234567890",
  "body": "Your verification code is 123456",
  "priority": "high"
}
```

### Send Bulk SMS
```http
POST /api/sms/bulk
Authorization: Bearer <jwt-token>
X-Tenant-ID: <tenant-id>

{
  "messages": [
    {"to": "+1234567890", "body": "Message 1"},
    {"to": "+0987654321", "body": "Message 2"}
  ],
  "batchSize": 50
}
```

### Check Status
```http
GET /api/sms/status/{jobId}
Authorization: Bearer <jwt-token>
```

### Get Analytics
```http
GET /api/sms/analytics?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <jwt-token>
X-Tenant-ID: <tenant-id>
```

## 🏗️ Architecture

### System Components
- **SMS Service**: Main orchestration layer
- **Provider Factory**: Multi-provider abstraction
- **Queue Manager**: Redis-based message queuing  
- **Analytics Service**: Real-time metrics and reporting
- **Authentication**: JWT-based security

### Queue Flow
```
API → Validation → Tenant Check → Queue → Provider → Delivery → Analytics
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm run test:coverage
```

## 🚀 Deployment

### Docker (Recommended)
```bash
docker build -t sms-system .
docker run -d -p 3001:3001 --env-file .env sms-system
```

### Docker Compose
```bash
docker-compose up -d
```

### Vercel Deployment
```bash
# With correct project ID
VERCEL_PROJECT_ID="prj_7b1JDb2Ya215lJk4kfCpE8r2vJkc" vercel --prod
```

### Production Server
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/server.js --name sms-system

# Set up startup
pm2 startup
pm2 save
```

See [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Service Statistics
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/sms/stats
```

### Queue Monitoring
- Waiting jobs
- Active processing
- Completed/failed counts
- Provider performance metrics

## 🔐 Security

### Features
- JWT authentication with configurable expiration
- API key validation for admin endpoints
- Rate limiting (global and tenant-specific)
- Input validation and sanitization
- CORS protection with configurable origins
- Helmet security headers

### Best Practices
- Never commit `.env` files
- Use strong JWT secrets in production
- Enable HTTPS for production deployments
- Regularly rotate API keys
- Monitor for suspicious activity

## 🎯 Rate Limiting

### Default Limits
- **Global**: 1000 requests per 15 minutes per IP
- **SMS Send**: 100 requests per 15 minutes per tenant
- **Bulk SMS**: 10 requests per 15 minutes per tenant
- **Status Check**: 200 requests per 15 minutes per tenant

Limits are configurable via environment variables.

## 📈 Analytics

### Available Metrics
- Messages sent/failed/queued
- Provider performance comparison
- Tenant usage statistics
- Cost tracking
- Delivery success rates
- Time-based trends

### Export Options
- JSON API responses
- CSV report generation
- Real-time metrics
- Historical data analysis

## 🔧 Provider Configuration

### Twilio Setup
1. Create Twilio account
2. Get Account SID and Auth Token
3. Purchase phone number
4. Configure webhook URL (optional)

### AWS SNS Setup  
1. Create AWS account with SNS access
2. Generate Access Key and Secret
3. Set up IAM permissions for SNS
4. Configure region

## 🐛 Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
# Check Redis status
redis-cli ping
```

**Provider Authentication Error**
- Verify API credentials in `.env`
- Check account balance/status
- Validate phone number formats

**High Memory Usage**
- Monitor queue sizes
- Check for stuck jobs
- Review analytics data retention

## 📚 Documentation

- [System Architecture](docs/SMS_ARCHITECTURE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Vercel Project Update](docs/VERCEL_PROJECT_UPDATE.md)
- [Complete System Guide](docs/SMS_SYSTEM_COMPLETE.md)
- [API Documentation](http://localhost:3001/api) (when running)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run `npm test` and `npm run lint`
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- Check [troubleshooting section](#troubleshooting)
- Review [documentation](docs/)
- Create issue for bugs/features
- Check provider documentation (Twilio/AWS)

---

**Enterprise SMS Management System - Production Ready**