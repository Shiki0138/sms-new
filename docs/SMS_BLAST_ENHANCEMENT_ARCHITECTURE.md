# SMS Blast Enhancement Architecture Design
## System Designer: Advanced SMS Campaign Management

### Executive Summary
This document outlines the comprehensive architecture for enhancing the existing SMS blast capabilities in the Salon Lumière system. The design focuses on scalability, campaign management, advanced scheduling, analytics, and optimized performance while building upon the existing Supabase + Twilio infrastructure.

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMS BLAST ENHANCEMENT SYSTEM                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Campaign    │  │   Template   │  │    Audience      │    │
│  │  Management   │  │  Management  │  │  Segmentation    │    │
│  │   Module      │  │    Module    │  │     Module       │    │
│  └───────────────┘  └──────────────┘  └──────────────────┘    │
│           │                 │                   │              │
│           └─────────────────┼───────────────────┘              │
│                            │                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              ENHANCED SMS ORCHESTRATOR                      │ │
│  │                                                            │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │ │
│  │  │  Scheduler   │ │ Rate Limiter │ │  Performance     │   │ │
│  │  │   Engine     │ │   Engine     │ │   Optimizer      │   │ │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               EXISTING SMS SERVICE LAYER                    │ │
│  │                                                            │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │ │
│  │  │   Twilio     │ │    Queue     │ │    Delivery      │   │ │
│  │  │  Provider    │ │   Manager    │ │    Tracking      │   │ │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 ANALYTICS & REPORTING                       │ │
│  │                                                            │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │ │
│  │  │  Real-time   │ │  Campaign    │ │    Performance   │   │ │
│  │  │  Dashboard   │ │   Reports    │ │    Metrics       │   │ │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema Enhancements

### New Tables Required

#### 1. SMS Campaigns Table
```sql
CREATE TABLE sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Campaign Configuration
    type VARCHAR(50) NOT NULL DEFAULT 'blast', -- 'blast', 'drip', 'reminder', 'promotional'
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Content
    template_id UUID REFERENCES sms_templates(id),
    message_content TEXT NOT NULL,
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    repeat_pattern JSONB, -- For recurring campaigns
    
    -- Targeting
    target_criteria JSONB NOT NULL, -- Audience segmentation rules
    estimated_recipients INTEGER DEFAULT 0,
    
    -- Performance Settings
    batch_size INTEGER DEFAULT 50,
    send_rate_per_minute INTEGER DEFAULT 60,
    max_retries INTEGER DEFAULT 3,
    
    -- Tracking
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    cost_estimate DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_sms_campaigns_user_status ON sms_campaigns(user_id, status);
CREATE INDEX idx_sms_campaigns_scheduled ON sms_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_sms_campaigns_type ON sms_campaigns(type);
```

#### 2. SMS Templates Table (Enhanced)
```sql
CREATE TABLE sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Template Details
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'promotional', 'reminder', 'notification', 'welcome'
    description TEXT,
    
    -- Content
    subject VARCHAR(255), -- For MMS or rich messaging
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Available template variables
    
    -- Validation
    character_count INTEGER,
    estimated_segments INTEGER DEFAULT 1,
    
    -- Usage Tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Compliance
    compliance_checked BOOLEAN DEFAULT false,
    compliance_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_sms_templates_user_active ON sms_templates(user_id, is_active);
CREATE INDEX idx_sms_templates_category ON sms_templates(category);
CREATE INDEX idx_sms_templates_usage ON sms_templates(usage_count DESC);
```

#### 3. Audience Segments Table
```sql
CREATE TABLE audience_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Segment Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Segmentation Rules
    criteria JSONB NOT NULL, -- Complex filtering rules
    estimated_size INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    
    -- Dynamic vs Static
    is_dynamic BOOLEAN DEFAULT true, -- Auto-updates vs fixed list
    customer_ids UUID[] DEFAULT '{}', -- For static segments
    
    -- Usage
    campaign_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_audience_segments_user ON audience_segments(user_id, is_active);
CREATE INDEX idx_audience_segments_dynamic ON audience_segments(is_dynamic);
```

#### 4. Campaign Recipients Table
```sql
CREATE TABLE campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    
    -- Message Details
    phone_number VARCHAR(20) NOT NULL,
    personalized_content TEXT,
    
    -- Delivery Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
    provider_message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Error Handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Cost Tracking
    cost DECIMAL(6,4),
    segments_used INTEGER DEFAULT 1,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaign_recipients_campaign_status ON campaign_recipients(campaign_id, status);
CREATE INDEX idx_campaign_recipients_phone ON campaign_recipients(phone_number);
CREATE INDEX idx_campaign_recipients_sent_at ON campaign_recipients(sent_at);
```

#### 5. Campaign Analytics Table
```sql
CREATE TABLE campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    
    -- Time Metrics
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hour_of_day INTEGER,
    day_of_week INTEGER,
    
    -- Performance Metrics
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,
    delivery_rate DECIMAL(5,4),
    
    -- Response Metrics (if applicable)
    responses_received INTEGER DEFAULT 0,
    opt_outs INTEGER DEFAULT 0,
    
    -- Cost Metrics
    cost_incurred DECIMAL(10,2),
    cost_per_message DECIMAL(6,4),
    
    -- Provider Performance
    provider_name VARCHAR(50),
    average_delivery_time INTERVAL,
    
    -- Additional Metrics
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_campaign_analytics_campaign_time ON campaign_analytics(campaign_id, recorded_at);
CREATE INDEX idx_campaign_analytics_provider ON campaign_analytics(provider_name);
```

---

## 🚀 API Endpoint Specifications

### Enhanced Campaign Management Endpoints

#### 1. Campaign CRUD Operations
```javascript
// Create Campaign
POST /api/campaigns/sms
{
  "name": "Spring Promotion 2024",
  "description": "Special offers for returning customers",
  "type": "blast",
  "templateId": "template-uuid",
  "messageContent": "Hello {{firstName}}! Special 20% off this week...",
  "scheduledAt": "2024-03-15T10:00:00+09:00",
  "targetCriteria": {
    "segmentId": "segment-uuid",
    "customFilters": {
      "lastVisitDays": { "min": 30, "max": 90 },
      "visitCount": { "min": 2 },
      "tags": ["vip", "regular"]
    }
  },
  "batchSize": 100,
  "sendRatePerMinute": 120
}

// Update Campaign
PUT /api/campaigns/sms/:campaignId
{
  "name": "Updated Campaign Name",
  "scheduledAt": "2024-03-16T10:00:00+09:00",
  "status": "scheduled"
}

// Get Campaign Details
GET /api/campaigns/sms/:campaignId
Response: {
  "campaign": {...},
  "recipients": {
    "total": 150,
    "pending": 100,
    "sent": 50,
    "delivered": 45,
    "failed": 5
  },
  "analytics": {...}
}

// List Campaigns
GET /api/campaigns/sms?status=active&type=blast&page=1&limit=20
```

#### 2. Advanced Scheduling Endpoints
```javascript
// Schedule Campaign
POST /api/campaigns/sms/:campaignId/schedule
{
  "scheduledAt": "2024-03-15T10:00:00+09:00",
  "timezone": "Asia/Tokyo",
  "repeatPattern": {
    "type": "weekly",
    "interval": 1,
    "daysOfWeek": [1, 3, 5], // Monday, Wednesday, Friday
    "endDate": "2024-06-15T23:59:59+09:00"
  }
}

// Pause/Resume Campaign
POST /api/campaigns/sms/:campaignId/pause
POST /api/campaigns/sms/:campaignId/resume

// Cancel Campaign
POST /api/campaigns/sms/:campaignId/cancel
```

#### 3. Template Management
```javascript
// Create Template
POST /api/templates/sms
{
  "name": "Appointment Reminder",
  "category": "reminder",
  "content": "Hi {{firstName}}! Your appointment at {{salonName}} is tomorrow at {{appointmentTime}}.",
  "variables": ["firstName", "salonName", "appointmentTime"],
  "tags": ["reminder", "appointment"]
}

// Template Preview
POST /api/templates/sms/:templateId/preview
{
  "variables": {
    "firstName": "田中",
    "salonName": "Salon Lumière",
    "appointmentTime": "10:00"
  }
}
```

#### 4. Audience Segmentation
```javascript
// Create Segment
POST /api/segments
{
  "name": "High-Value Customers",
  "criteria": {
    "and": [
      { "field": "totalSales", "operator": "gte", "value": 50000 },
      { "field": "visitCount", "operator": "gte", "value": 5 },
      { "field": "lastVisitDate", "operator": "gte", "value": "2024-01-01" }
    ]
  },
  "isDynamic": true
}

// Preview Segment
POST /api/segments/:segmentId/preview
Response: {
  "estimatedSize": 85,
  "sampleCustomers": [...],
  "criteria": {...}
}
```

#### 5. Analytics & Reporting
```javascript
// Campaign Performance
GET /api/campaigns/sms/:campaignId/analytics
Response: {
  "overview": {
    "totalSent": 1000,
    "deliveryRate": 0.95,
    "costPerMessage": 0.08,
    "totalCost": 80.00
  },
  "timeline": [
    {
      "timestamp": "2024-03-15T10:00:00Z",
      "sent": 100,
      "delivered": 95,
      "failed": 5
    }
  ],
  "providerPerformance": {
    "twilio": {
      "deliveryRate": 0.96,
      "averageDeliveryTime": "00:00:03"
    }
  }
}

// Real-time Dashboard
GET /api/campaigns/sms/dashboard
WebSocket: /ws/campaigns/real-time-updates
```

---

## ⚡ Performance Optimization Strategy

### 1. Smart Rate Limiting
```javascript
const RateLimitConfig = {
  twilio: {
    messagesPerSecond: 1,
    messagesPerMinute: 60,
    dailyLimit: 10000,
    adaptiveScaling: true
  },
  awsSns: {
    messagesPerSecond: 10,
    messagesPerMinute: 600,
    dailyLimit: 100000,
    adaptiveScaling: true
  }
};

class SmartRateLimiter {
  async optimizeDeliverySchedule(campaign, recipients) {
    const timeSlots = this.calculateOptimalTimeSlots(campaign.scheduledAt);
    const batchPlan = this.distributeBatches(recipients, timeSlots);
    return this.createExecutionPlan(batchPlan);
  }
}
```

### 2. Intelligent Batching
```javascript
class IntelligentBatcher {
  createBatches(recipients, strategy = 'time-optimized') {
    switch (strategy) {
      case 'time-optimized':
        return this.optimizeForDeliveryTime(recipients);
      case 'cost-optimized':
        return this.optimizeForCost(recipients);
      case 'provider-balanced':
        return this.balanceAcrossProviders(recipients);
    }
  }
}
```

### 3. Delivery Time Optimization
```javascript
const DeliveryOptimizer = {
  bestTimes: {
    promotional: ['09:00-11:00', '14:00-16:00', '19:00-20:00'],
    reminder: ['18:00-19:00'], // Day before appointment
    urgent: 'immediate'
  },
  
  timezone_mapping: {
    'Asia/Tokyo': '+09:00',
    'Asia/Osaka': '+09:00'
  },
  
  calculateOptimalDeliveryTime(campaignType, timezone, scheduledAt) {
    // Algorithm to determine best delivery time
  }
};
```

---

## 📈 Implementation Phases

### Phase 1: MVP (4-6 weeks)
**Core Campaign Management**
1. ✅ Campaign CRUD operations
2. ✅ Basic template system
3. ✅ Simple audience segmentation
4. ✅ Enhanced bulk SMS endpoint
5. ✅ Basic scheduling
6. ✅ Real-time status tracking

**Database Changes:**
- Create `sms_campaigns` table
- Create `sms_templates` table
- Create `campaign_recipients` table
- Enhance existing customer table with SMS preferences

**API Endpoints:**
- `/api/campaigns/sms/*` (CRUD)
- `/api/templates/sms/*` (Template management)
- Enhanced `/api/sms/bulk` endpoint

### Phase 2: Advanced Features (6-8 weeks)
**Smart Scheduling & Analytics**
1. ✅ Advanced scheduling engine
2. ✅ Delivery time optimization
3. ✅ Comprehensive analytics dashboard
4. ✅ Performance monitoring
5. ✅ A/B testing capabilities
6. ✅ Advanced segmentation

**New Features:**
- Recurring campaigns
- Timezone-aware scheduling
- Provider failover
- Cost optimization
- Response tracking

### Phase 3: Enterprise Features (4-6 weeks)
**Scalability & Advanced Analytics**
1. ✅ Multi-provider load balancing
2. ✅ Advanced compliance features
3. ✅ White-label customization
4. ✅ API rate limiting per tenant
5. ✅ Advanced reporting & BI integration
6. ✅ Webhook notifications

---

## 🔧 Integration Points with Existing Codebase

### 1. Enhanced Bulk SMS Endpoint
```javascript
// Extend existing /api/sms/bulk endpoint
app.post('/api/sms/bulk', async (req, res) => {
  const { campaignId, useAdvancedFeatures = false } = req.body;
  
  if (useAdvancedFeatures && campaignId) {
    // Use new campaign system
    return await advancedCampaignHandler(req, res);
  } else {
    // Fall back to existing simple bulk SMS
    return await existingBulkHandler(req, res);
  }
});
```

### 2. Customer Integration
```javascript
// Enhance existing customer model
const customerEnhancements = {
  smsPreferences: {
    allowPromotional: true,
    allowReminders: true,
    preferredTime: '10:00-18:00',
    timezone: 'Asia/Tokyo'
  },
  segmentMemberships: [], // Dynamic segment tracking
  campaignHistory: [], // Previous campaign interactions
  optOutDate: null,
  lastSmsResponse: null
};
```

### 3. Existing Campaign System Integration
```javascript
// Bridge with existing campaigns table
class CampaignBridge {
  static async migrateExistingCampaigns() {
    const existingCampaigns = await db.campaigns.findAll();
    for (const campaign of existingCampaigns) {
      if (campaign.channels.includes('sms')) {
        await this.createEnhancedSMSCampaign(campaign);
      }
    }
  }
}
```

---

## 🛡️ Scalability Considerations

### 1. Horizontal Scaling
```javascript
const ScalingStrategy = {
  queueManagement: {
    redis_cluster: true,
    queue_sharding: 'by_tenant',
    priority_queues: ['urgent', 'normal', 'low']
  },
  
  providerScaling: {
    auto_failover: true,
    load_balancing: 'round_robin',
    health_checks: 'every_30s'
  },
  
  database: {
    read_replicas: 3,
    sharding_strategy: 'by_tenant',
    caching_layer: 'redis'
  }
};
```

### 2. Performance Monitoring
```javascript
const PerformanceMetrics = {
  sms_delivery_rate: 'target: >95%',
  average_delivery_time: 'target: <10s',
  queue_processing_time: 'target: <1s',
  api_response_time: 'target: <200ms',
  provider_uptime: 'target: >99.9%'
};
```

### 3. Cost Optimization
```javascript
class CostOptimizer {
  static async optimizeProviderSelection(recipients, budget) {
    const providerCosts = await this.getProviderCosts();
    const deliveryRates = await this.getProviderDeliveryRates();
    
    return this.calculateOptimalDistribution(
      recipients, 
      providerCosts, 
      deliveryRates, 
      budget
    );
  }
}
```

---

## 🎯 Success Metrics

### Performance KPIs
- **Delivery Rate**: >95% within 60 seconds
- **System Throughput**: 10,000+ SMS/hour
- **API Response Time**: <200ms for campaign creation
- **Queue Processing**: <1 second per message
- **Provider Failover**: <30 seconds detection and switch

### Business KPIs
- **Campaign Creation Time**: <5 minutes from concept to launch
- **Segmentation Accuracy**: >90% relevance score
- **Cost Efficiency**: 15% reduction in SMS costs through optimization
- **User Adoption**: 80% of salon users create campaigns within 30 days
- **ROI Improvement**: 25% increase in campaign effectiveness

---

## 📚 Technical Specifications

### Technology Stack
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Queue System**: Redis
- **SMS Provider**: Twilio (Primary), AWS SNS (Secondary)
- **Caching**: Redis
- **Monitoring**: Custom analytics + existing logging
- **Real-time**: WebSockets for live campaign monitoring

### Security Measures
- JWT authentication for all endpoints
- Rate limiting per tenant/user
- Input validation and sanitization
- SMS content compliance checking
- Audit logging for all campaign actions
- GDPR compliance for customer data

---

## 🔄 Migration Strategy

### Data Migration
1. **Existing Campaigns**: Migrate to new schema with enhanced features
2. **Customer Data**: Add SMS preferences and segmentation data
3. **Message Templates**: Convert existing templates to new format
4. **Analytics**: Preserve historical data while adding new metrics

### Backward Compatibility
- Existing `/api/sms/bulk` endpoint remains functional
- Gradual feature rollout with feature flags
- Dual-mode operation during transition period
- Comprehensive testing with existing data

---

This architecture design provides a comprehensive foundation for transforming the existing basic SMS functionality into a sophisticated campaign management system while maintaining compatibility with the current Salon Lumière infrastructure.