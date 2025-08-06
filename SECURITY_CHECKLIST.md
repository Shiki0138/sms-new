# 🛡️ Production Security Checklist

**Application:** SMS美容サロン管理システム  
**Last Updated:** August 5, 2025  
**Review Status:** ⚠️ CRITICAL FIXES REQUIRED  

---

## 🚨 CRITICAL - Must Fix Before Production

### ✅ Environment & Configuration
- [x] ~~CORS configuration added to `vite.config.ts`~~
- [x] ~~Security headers middleware created~~
- [x] ~~Input validation utilities implemented~~
- [ ] **UPDATE .env.production with production values**
- [ ] **Remove all .env files from repository**
- [ ] **Configure HTTPS/SSL certificates**
- [ ] **Set up proper domain configuration**

### 🔐 Authentication & Authorization  
- [x] ~~Supabase RLS policies verified~~
- [x] ~~JWT token handling implemented~~
- [x] ~~Protected routes configured~~
- [ ] **Test multi-tenant isolation in production**
- [ ] **Configure session timeout (currently 1 hour)**
- [ ] **Set up account lockout policies**

### 🌐 API Security
- [x] ~~Webhook signature validation enhanced~~
- [x] ~~Rate limiting middleware created~~
- [ ] **Enable webhook signature validation in production**
- [ ] **Configure rate limits per environment**
- [ ] **Set up API monitoring and alerting**
- [ ] **Implement request timeout configurations**

### 📊 Database Security
- [x] ~~RLS policies comprehensive and tested~~
- [x] ~~Parameterized queries via Supabase client~~
- [ ] **Verify backup encryption settings**
- [ ] **Configure data retention policies**
- [ ] **Test tenant data isolation**

---

## 🟡 HIGH PRIORITY - Complete This Week

### 🔧 Infrastructure Setup
- [ ] **Configure Web Application Firewall (WAF)**
- [ ] **Enable DDoS protection**
- [ ] **Set up SSL/TLS with HSTS headers**
- [ ] **Configure CDN for static assets**

### 📝 Logging & Monitoring
- [ ] **Set up security event logging**
- [ ] **Configure failed login attempt alerts**
- [ ] **Implement audit trail for admin actions**
- [ ] **Monitor API usage patterns**

### 🛠️ Application Security
- [ ] **Implement CSP headers**
- [ ] **Add security headers to all responses**
- [ ] **Configure proper error handling**
- [ ] **Sanitize all error messages**

---

## 🟢 MEDIUM PRIORITY - Next 2 Weeks

### 🔍 Security Testing
- [ ] **Conduct penetration testing**
- [ ] **Perform vulnerability assessment**
- [ ] **Test rate limiting effectiveness**
- [ ] **Validate input sanitization**

### 📋 Compliance & Documentation
- [ ] **Document security policies**
- [ ] **Create incident response procedures**
- [ ] **Set up regular security reviews**
- [ ] **Train team on security practices**

---

## 📋 Detailed Action Items

### 1. Environment Configuration

#### Update Production Environment Variables
```bash
# .env.production
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# Server-side only (NOT accessible to client)
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
LINE_CHANNEL_SECRET=your-production-line-secret
INSTAGRAM_APP_SECRET=your-production-instagram-secret

# Security Configuration
VITE_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SESSION_SECRET=generate-strong-session-secret
```

#### Remove Sensitive Files
```bash
# Add to .gitignore
.env
.env.local
.env.production
.env.development

# Remove from repository
git rm --cached .env .env.local .env.production .env.development
git commit -m "Remove sensitive environment files"
```

### 2. Security Headers Implementation

#### Netlify Configuration
Update `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.line.me https://generativelanguage.googleapis.com"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

#### Vercel Configuration  
Update `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options", 
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.line.me https://generativelanguage.googleapis.com"
        }
      ]
    }
  ]
}
```

### 3. Webhook Security

#### Enable Signature Validation
Update webhook handlers to always validate signatures in production:

```typescript
// src/api/webhooks/line.ts
const channelSecret = process.env.LINE_CHANNEL_SECRET;
if (!channelSecret) {
  console.error('LINE_CHANNEL_SECRET not configured');
  return res.status(500).json({ error: 'Server configuration error' });
}

if (!validateSignature(body, signature, channelSecret)) {
  console.warn('Invalid LINE webhook signature detected');
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### 4. Rate Limiting Configuration

#### API Endpoints
```typescript
// Apply rate limiting to all API routes
import { rateLimitByIP } from '../middleware/security';

export default async function handler(req: any, res: any) {
  // Rate limit: 100 requests per minute per IP
  if (!rateLimitByIP(req, { windowMs: 60000, maxRequests: 100 })) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  // Continue with request processing...
}
```

#### Webhook Endpoints
```typescript
// Webhook-specific rate limiting
import { rateLimitWebhook } from '../middleware/security';

if (!rateLimitWebhook('line', sourceUserId, { windowMs: 60000, maxRequests: 1000 })) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

### 5. Monitoring Setup

#### Security Event Logging
```typescript
import { logSecurityEvent } from '../middleware/security';

// Log suspicious activities
logSecurityEvent('failed_login_attempt', {
  email: sanitizedEmail,
  ip: clientIP,
  timestamp: new Date().toISOString()
}, 'medium');

logSecurityEvent('rate_limit_exceeded', {
  endpoint: req.url,
  ip: clientIP,
  userAgent: req.headers['user-agent']
}, 'high');
```

#### Supabase Security Monitoring
```sql
-- Monitor failed authentication attempts
SELECT 
  auth.users.email,
  COUNT(*) as failed_attempts,
  MAX(auth.audit_log_entries.created_at) as last_attempt
FROM auth.audit_log_entries
JOIN auth.users ON auth.users.id = auth.audit_log_entries.user_id
WHERE auth.audit_log_entries.event_name = 'user_signedin_failed'
  AND auth.audit_log_entries.created_at > NOW() - INTERVAL '1 hour'
GROUP BY auth.users.email
HAVING COUNT(*) > 5;
```

---

## 🧪 Testing Procedures

### Security Testing Checklist

#### Authentication Testing
- [ ] Test login with invalid credentials
- [ ] Test session timeout functionality  
- [ ] Test JWT token expiration and refresh
- [ ] Verify protected routes redirect properly
- [ ] Test multi-tenant isolation

#### Authorization Testing
- [ ] Test RLS policies for each table
- [ ] Verify users can only access their tenant data
- [ ] Test admin vs user permission differences
- [ ] Validate API endpoint access controls

#### Input Validation Testing
- [ ] Test XSS prevention in forms
- [ ] Test SQL injection prevention
- [ ] Validate file upload restrictions
- [ ] Test input length limits
- [ ] Verify special character handling

#### Rate Limiting Testing
- [ ] Test API rate limits
- [ ] Test webhook rate limits
- [ ] Verify rate limit headers
- [ ] Test rate limit reset functionality

#### Security Headers Testing
```bash
# Test security headers
curl -I https://yourdomain.com

# Should include:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 🚨 Incident Response Plan

### Security Incident Classification

#### Critical (Response: Immediate)
- Data breach or unauthorized access
- System compromise
- Production service disruption

#### High (Response: 1 Hour)  
- Authentication bypass
- Privilege escalation
- Webhook compromise

#### Medium (Response: 4 Hours)
- Rate limiting issues
- Input validation bypass
- Configuration errors

#### Low (Response: 24 Hours)
- Security header issues
- Non-critical logging failures
- Performance degradation

### Response Procedures

1. **Immediate Actions**
   - Assess and contain the incident
   - Document all evidence
   - Notify relevant stakeholders
   
2. **Investigation**
   - Review security logs
   - Identify attack vectors
   - Determine scope of impact
   
3. **Remediation**
   - Apply security patches
   - Update configurations
   - Reset compromised credentials
   
4. **Recovery**
   - Restore services
   - Verify system integrity
   - Monitor for recurring issues
   
5. **Post-Incident**
   - Document lessons learned
   - Update security policies
   - Improve monitoring

---

## 📊 Security Metrics & KPIs

### Monitor These Metrics
- Failed authentication attempts per hour
- Rate limit violations per endpoint
- Webhook signature validation failures
- Database policy violations
- API response times under load
- Security header compliance

### Alerting Thresholds
- **Critical:** 50+ failed logins in 5 minutes
- **High:** 100+ rate limit violations in 10 minutes  
- **Medium:** 10+ webhook signature failures in 5 minutes
- **Low:** Security header missing for >1% of requests

---

## ✅ Deployment Verification

Before going live, verify:

### Pre-Deployment Checklist
- [ ] All environment variables configured
- [ ] Security headers implemented
- [ ] Webhook signature validation enabled
- [ ] Rate limiting configured
- [ ] SSL/TLS certificates installed
- [ ] CORS properly configured
- [ ] Database RLS policies active
- [ ] Monitoring and alerting configured

### Post-Deployment Verification
- [ ] Security headers present in responses
- [ ] Authentication flow working
- [ ] Authorization policies enforced
- [ ] Rate limiting functional
- [ ] Webhooks receiving and validating signatures
- [ ] Error handling not exposing sensitive info
- [ ] Monitoring capturing security events

---

**⚠️ CRITICAL REMINDER:** Do not deploy to production until all CRITICAL and HIGH priority items are completed and tested.

**Next Review Date:** September 5, 2025  
**Responsible Team:** Development + Security Team