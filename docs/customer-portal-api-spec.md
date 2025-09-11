# Customer Portal API Specification

## 🎯 Customer-Facing API Extensions

### 1. Public Booking API

#### GET /api/public/services
```javascript
// Response
{
  "services": [
    {
      "id": "uuid",
      "name": "カット&カラー",
      "description": "髪をカットしてカラーリング",
      "duration": 120,
      "price": 8000,
      "category": "カラー",
      "isAvailable": true
    }
  ]
}
```

#### GET /api/public/staff/availability
```javascript
// Query: ?date=2025-09-15&serviceId=uuid
// Response
{
  "date": "2025-09-15",
  "staff": [
    {
      "id": "uuid",
      "name": "スタイリスト佐藤",
      "availableSlots": [
        {
          "startTime": "09:00",
          "endTime": "11:00",
          "isAvailable": true
        }
      ]
    }
  ]
}
```

#### POST /api/public/appointments/book
```javascript
// Request
{
  "customer": {
    "firstName": "花子",
    "lastName": "田中",
    "email": "tanaka@example.com",
    "phone": "090-1234-5678"
  },
  "appointment": {
    "staffId": "uuid",
    "serviceIds": ["uuid1", "uuid2"],
    "date": "2025-09-15",
    "startTime": "09:00",
    "notes": "初回来店です"
  }
}

// Response
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "confirmationCode": "ABC123",
    "status": "pending_confirmation"
  },
  "message": "予約が完了しました。確認メールをお送りします。"
}
```

### 2. Customer Portal API

#### GET /api/customer/dashboard
```javascript
// Headers: Authorization: Bearer <customer-token>
// Response
{
  "customer": {
    "id": "uuid",
    "name": "田中 花子",
    "memberSince": "2024-03-15",
    "loyaltyPoints": 450
  },
  "upcomingAppointments": [],
  "recentAppointments": [],
  "favoriteServices": [],
  "statistics": {
    "totalVisits": 12,
    "totalSpent": 96000,
    "averageSpent": 8000
  }
}
```

#### GET /api/customer/appointments/history
```javascript
// Query: ?page=1&limit=10
// Response
{
  "appointments": [
    {
      "id": "uuid",
      "date": "2025-09-01",
      "services": ["カット&カラー"],
      "staff": "スタイリスト佐藤",
      "totalPrice": 8000,
      "status": "completed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "hasMore": true
  }
}
```

#### PUT /api/customer/profile
```javascript
// Request
{
  "phone": "090-1234-5678",
  "preferences": {
    "communicationMethod": "email",
    "notifications": {
      "appointments": true,
      "promotions": false
    }
  }
}

// Response
{
  "success": true,
  "customer": { /* updated customer data */ }
}
```

### 3. Appointment Management

#### PUT /api/customer/appointments/:id/reschedule
```javascript
// Request
{
  "newDate": "2025-09-20",
  "newTime": "14:00",
  "reason": "予定変更のため"
}

// Response
{
  "success": true,
  "appointment": {
    "id": "uuid",
    "status": "rescheduled",
    "originalDate": "2025-09-15",
    "newDate": "2025-09-20"
  }
}
```

#### DELETE /api/customer/appointments/:id/cancel
```javascript
// Request
{
  "reason": "体調不良のため",
  "refundRequest": false
}

// Response
{
  "success": true,
  "cancellation": {
    "id": "uuid",
    "cancelledAt": "2025-09-10T10:30:00Z",
    "refundAmount": 0,
    "cancellationFee": 1000
  }
}
```

## 🔒 Authentication Flow

### 1. Customer Registration
```javascript
POST /api/customer/register
{
  "firstName": "花子",
  "lastName": "田中",
  "email": "tanaka@example.com",
  "phone": "090-1234-5678",
  "password": "securePassword123",
  "preferences": {
    "communicationMethod": "email"
  }
}
```

### 2. Email Verification
```javascript
POST /api/customer/verify-email
{
  "token": "verification-token-from-email"
}
```

### 3. Password Reset
```javascript
POST /api/customer/forgot-password
{
  "email": "tanaka@example.com"
}

POST /api/customer/reset-password
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

## 📱 Mobile API Considerations

### Push Notifications
```javascript
POST /api/customer/devices/register
{
  "deviceToken": "fcm-device-token",
  "platform": "ios|android",
  "appVersion": "1.0.0"
}
```

### Offline Support
```javascript
GET /api/customer/sync
// Returns: last modified timestamps for cache invalidation

POST /api/customer/sync/conflicts
// Handles: offline data conflicts resolution
```

## 🔐 Security Considerations

1. **Rate Limiting**: 100 requests per 15 minutes per IP
2. **Input Validation**: All user inputs sanitized
3. **CORS**: Restricted to registered domains
4. **Authentication**: JWT with 24h expiry + refresh tokens
5. **Data Encryption**: PII data encrypted at rest
6. **Audit Logging**: All customer actions logged