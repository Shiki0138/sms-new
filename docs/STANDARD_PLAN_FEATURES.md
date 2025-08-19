# Standard Plan Features Documentation

## Overview

The Standard Plan includes all Light Plan features plus four powerful business growth tools designed to increase revenue and improve customer retention.

## Feature List

### 1. Smart Upselling Feature (AI-based suggestions)

**Purpose**: Increase revenue by intelligently suggesting additional services to customers based on their purchase history and preferences.

**Key Features**:
- AI-powered service recommendations
- Customer purchase pattern analysis
- Confidence scoring for each suggestion
- Revenue potential calculations
- Real-time analytics dashboard

**API Endpoints**:
- `GET /api/upselling/suggestions/:customerId` - Get AI suggestions for a customer
- `PUT /api/upselling/suggestions/:suggestionId` - Update suggestion status
- `GET /api/upselling/analytics` - View upselling performance metrics
- `POST /api/upselling/analyze/:customerId` - Trigger customer analysis

**How It Works**:
1. System analyzes customer's appointment history
2. AI identifies complementary services based on patterns
3. Calculates confidence scores and potential revenue
4. Presents ranked suggestions to staff
5. Tracks acceptance/rejection for continuous improvement

### 2. Membership Management

**Purpose**: Create recurring revenue streams through monthly subscription plans.

**Key Features**:
- Multiple membership tier creation
- Automated monthly billing
- Member benefits management
- Auto-renewal functionality
- Membership analytics

**API Endpoints**:
- `GET /api/memberships/tiers` - List all membership tiers
- `POST /api/memberships/tiers` - Create new tier
- `PUT /api/memberships/tiers/:tierId` - Update tier
- `GET /api/memberships/customers/:customerId` - Get customer memberships
- `POST /api/memberships/customers/:customerId/subscribe` - Subscribe customer
- `PUT /api/memberships/customers/:customerId/cancel` - Cancel membership
- `GET /api/memberships/analytics` - View membership metrics

**Membership Benefits Options**:
- Percentage discounts on all services
- Priority booking privileges
- Free monthly services
- Exclusive member-only services

### 3. Referral Tracking System

**Purpose**: Grow customer base through word-of-mouth marketing with trackable referral programs.

**Key Features**:
- Unique referral code generation
- Referral conversion tracking
- Automated reward management
- Thank you message automation
- Referral analytics

**API Endpoints**:
- `GET /api/referrals/customer/:customerId` - Get customer's referral program
- `POST /api/referrals/create` - Create new referral
- `POST /api/referrals/convert/:referralCode` - Convert referral
- `GET /api/referrals/rewards/:customerId` - View available rewards
- `POST /api/referrals/rewards/:rewardId/apply` - Apply reward
- `GET /api/referrals/analytics` - View referral metrics

**Reward Types**:
- Percentage discounts
- Fixed amount credits
- Free services

### 4. Basic Inventory Management

**Purpose**: Track retail product stock levels and manage inventory for salon retail sales.

**Key Features**:
- Product catalog management
- Real-time stock tracking
- Low stock alerts
- Purchase/sale transaction recording
- Inventory valuation reports

**API Endpoints**:
- `GET /api/inventory/products` - List all products
- `POST /api/inventory/products` - Add new product
- `PUT /api/inventory/products/:productId` - Update product
- `POST /api/inventory/transactions` - Record stock transaction
- `GET /api/inventory/alerts/low-stock` - Get low stock alerts
- `GET /api/inventory/reports` - Generate inventory reports

**Transaction Types**:
- Purchase (stock in)
- Sale (stock out)
- Return
- Adjustment

## Plan Restrictions

### How Plan Restrictions Work

1. **Middleware Check**: Every API request passes through `checkFeatureAccess` middleware
2. **Plan Verification**: System checks user's subscription_plan against feature requirements
3. **Access Control**: 
   - Allowed: Request proceeds normally
   - Denied: Returns 403 error with upgrade information

### Error Response Format

When a Light plan user tries to access Standard features:

```json
{
  "error": "Feature not available in your current plan",
  "code": "PLAN_UPGRADE_REQUIRED",
  "currentPlan": "light",
  "requiredPlan": "standard",
  "feature": "smart_upselling",
  "message": "Upgrade to Standard plan to unlock AI-powered upselling suggestions that can increase your revenue by up to 30%!",
  "upgradeUrl": "/settings/subscription"
}
```

### Frontend Handling

Use the `PlanRestrictionWrapper` component to show/hide features:

```tsx
<PlanRestrictionWrapper feature="smart_upselling" requiredPlan="standard">
  <UpsellingComponent />
</PlanRestrictionWrapper>
```

## Implementation Details

### Database Schema

All Standard Plan features have dedicated database tables:
- `upselling_suggestions` - AI suggestions
- `customer_purchase_analysis` - Purchase patterns
- `membership_tiers` - Subscription plans
- `customer_memberships` - Active subscriptions
- `referrals` - Referral tracking
- `referral_rewards` - Reward management
- `products` - Inventory items
- `inventory_transactions` - Stock movements

### Plan Feature Configuration

Features are configured in the `plan_features` table:

```sql
INSERT INTO plan_features (plan_name, feature_name, is_enabled) VALUES
('standard', 'smart_upselling', TRUE),
('standard', 'membership_management', TRUE),
('standard', 'referral_tracking', TRUE),
('standard', 'inventory_management', TRUE);
```

## Testing

Run the test suite to verify plan restrictions:

```bash
node tests/planRestrictions.test.js
```

Expected results:
- Light users: Can access basic features, blocked from Standard features
- Standard users: Can access all Standard and Light features
- Premium users: Can access all features

## Best Practices

1. **Always check plan access** before showing UI elements
2. **Provide clear upgrade paths** when features are restricted
3. **Test with different user plans** during development
4. **Monitor feature usage** to demonstrate value to customers
5. **Keep upgrade messages positive** and value-focused

## Migration Notes

When migrating from Light to Standard plan:
1. Run database migration: `20250113_add_standard_plan_features.sql`
2. Update user's subscription_plan in database
3. Clear user cache to reflect new permissions
4. Features become immediately available