# SMS System Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the SMS System to various environments.

## Prerequisites

### System Requirements
- Node.js 18.0.0 or higher
- Redis 6.0 or higher (for message queuing)
- PostgreSQL 13+ (optional, for persistent analytics)
- SSL certificates for production

### SMS Provider Accounts
- **Twilio Account** (recommended)
  - Account SID
  - Auth Token  
  - Phone Number
- **AWS Account** (alternative)
  - Access Key ID
  - Secret Access Key
  - SNS permissions

## Local Development

### 1. Clone and Install
```bash
git clone <repository-url>
cd 017_SMS
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Redis (Docker)
```bash
docker run -d --name sms-redis -p 6379:6379 redis:alpine
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Verify Installation
- Health check: http://localhost:3001/health
- API docs: http://localhost:3001/api

## Production Deployment

### Option 1: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set permissions
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sms -u 1001
RUN chown -R sms:nodejs /app
USER sms

EXPOSE 3001

CMD ["npm", "start"]
```

#### 2. Build and Run
```bash
docker build -t sms-system .
docker run -d \
  --name sms-system \
  -p 3001:3001 \
  --env-file .env \
  sms-system
```

#### 3. Docker Compose (Recommended)
```yaml
version: '3.8'
services:
  sms-app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    depends_on:
      - redis
    restart: unless-stopped
    
  redis:
    image: redis:alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - sms-app
    restart: unless-stopped

volumes:
  redis_data:
```

### Option 2: Cloud Deployment (AWS/Heroku)

#### AWS Elastic Beanstalk
```bash
# Install EB CLI
pip install awsebcli

# Initialize and deploy
eb init
eb create sms-production
eb deploy
```

#### Heroku
```bash
# Install Heroku CLI and login
heroku create sms-system-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set TWILIO_ACCOUNT_SID=your-sid

# Deploy
git push heroku main
```

### Option 3: VPS/Server Deployment

#### 1. Server Setup (Ubuntu 20.04+)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install redis-server

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

#### 2. Application Setup
```bash
# Clone repository
git clone <repository-url> /var/www/sms-system
cd /var/www/sms-system

# Install dependencies
npm ci --only=production

# Configure environment
cp .env.example .env
# Edit .env with production values

# Set permissions
sudo chown -R www-data:www-data /var/www/sms-system
```

#### 3. PM2 Configuration
```json
{
  "apps": [{
    "name": "sms-system",
    "script": "src/server.js",
    "cwd": "/var/www/sms-system",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3001
    },
    "error_file": "/var/log/sms-system/error.log",
    "out_file": "/var/log/sms-system/out.log",
    "log_file": "/var/log/sms-system/combined.log"
  }]
}
```

#### 4. Start with PM2
```bash
# Create log directory
sudo mkdir -p /var/log/sms-system
sudo chown www-data:www-data /var/log/sms-system

# Start application
pm2 start ecosystem.json
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
upstream sms_backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://sms_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://sms_backend;
        access_log off;
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## Database Setup (Optional)

### PostgreSQL for Analytics
```sql
-- Create database and user
CREATE DATABASE sms_analytics;
CREATE USER sms_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE sms_analytics TO sms_user;

-- Connect to database and create tables
\c sms_analytics;

CREATE TABLE sms_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    tenant_id VARCHAR(100) NOT NULL,
    job_id VARCHAR(100),
    message_id VARCHAR(100),
    provider VARCHAR(50),
    phone_hash VARCHAR(20),
    message_length INTEGER,
    cost DECIMAL(10,4),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_events_tenant_date ON sms_events (tenant_id, created_at);
CREATE INDEX idx_sms_events_provider ON sms_events (provider);
CREATE INDEX idx_sms_events_type ON sms_events (event_type);
```

## Monitoring and Observability

### Health Checks
```bash
# Basic health check
curl http://localhost:3001/health

# Detailed service stats
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/sms/stats
```

### Logging
Configure log aggregation:
- **Development**: Console output
- **Production**: File-based with log rotation
- **Cloud**: Integrate with CloudWatch, ELK stack, or similar

### Metrics and Alerts
Set up monitoring for:
- API response times
- Queue lengths
- Error rates
- Provider success rates
- Memory/CPU usage

## Security Considerations

### Environment Variables
Never commit `.env` files to version control:
```bash
# Add to .gitignore
.env
.env.local
.env.production
logs/
```

### SSL/TLS
- Use HTTPS in production
- Implement proper certificate management
- Enable HSTS headers

### Access Control
- Implement proper JWT token management
- Use API keys for admin endpoints
- Set up CORS properly for frontend domains

### Provider Security
- Rotate API keys regularly
- Use webhook signature verification
- Implement rate limiting per tenant

## Testing Deployment

### Automated Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load testing (optional)
npm install -g artillery
artillery run load-test.yml
```

### Manual Verification
1. Health check responds correctly
2. SMS sending works with test numbers
3. Queue processing functions properly
4. Analytics data is recorded
5. Rate limiting is enforced
6. Error handling works correctly

## Troubleshooting

### Common Issues

#### Redis Connection Failed
```bash
# Check Redis status
redis-cli ping
sudo systemctl status redis

# Restart Redis
sudo systemctl restart redis
```

#### SMS Provider Errors
- Verify API credentials
- Check account balance/limits
- Validate phone number formats
- Review provider-specific documentation

#### High Memory Usage
- Monitor queue sizes
- Implement queue cleanup
- Optimize analytics data retention

### Log Analysis
```bash
# View application logs
pm2 logs sms-system

# Check system logs
sudo journalctl -u sms-system -f

# Monitor error rates
grep "ERROR" /var/log/sms-system/error.log | tail -20
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy)
- Deploy multiple app instances
- Shared Redis cluster
- Database read replicas

### Performance Optimization
- Implement caching strategies
- Optimize queue processing
- Use CDN for static assets
- Monitor and tune garbage collection

### Cost Management
- Monitor SMS provider costs
- Implement usage alerts
- Optimize queue batch sizes
- Use appropriate instance sizes

## Backup and Recovery

### Data Backup
```bash
# Redis backup
redis-cli BGSAVE

# Database backup
pg_dump sms_analytics > backup.sql

# Application backup
tar -czf sms-app-backup.tar.gz /var/www/sms-system
```

### Disaster Recovery
1. Maintain infrastructure as code
2. Regular backup verification
3. Documented recovery procedures
4. Test recovery processes regularly

---

For additional support or questions, please refer to the [API Documentation](../README.md) or create an issue in the repository.