# Menu Management System Guide

## Overview

The enhanced menu management system provides comprehensive tools for managing salon service menus with advanced features including dynamic pricing, staff assignments, and analytics.

## Features

### 1. **Service Menu CRUD Operations**
- **Create**: Add new services with detailed information
- **Read**: View services in grid or list format with filtering
- **Update**: Edit all service details including pricing and availability
- **Delete**: Soft delete with archiving capability

### 2. **Advanced Pricing Options**
- **Base Pricing**: Standard service price
- **Member Pricing**: Special rates for members
- **Time-based Pricing**: Peak and off-peak pricing
- **Day-based Pricing**: Weekday/weekend variations
- **Campaign Pricing**: Limited-time promotional rates
- **Package Deals**: Bundled service pricing

### 3. **Staff Management**
- **Skill Level Assignment**: Beginner to Expert levels
- **Custom Duration**: Staff-specific service times
- **Commission Rates**: Individual commission settings
- **Performance Tracking**: Service completion metrics

### 4. **Display & Organization**
- **Drag-and-drop Ordering**: Visual arrangement of services
- **Category Management**: Custom categories with colors
- **Featured Services**: Highlight popular offerings
- **Tag System**: Flexible service categorization
- **Image Support**: Visual service representation

### 5. **Online Booking Integration**
- **Availability Control**: Enable/disable online booking per service
- **Advance Booking Rules**: Min/max booking windows
- **Real-time Updates**: Instant availability changes

## Component Architecture

### Main Components

1. **MenuManagementDashboard**
   - Central hub for all menu operations
   - Statistics overview
   - Category filtering
   - Bulk operations

2. **MenuEditModalEnhanced**
   - Comprehensive service editing
   - Multi-tab interface (Basic, Display, Booking)
   - Image upload support
   - Tag management

3. **MenuPricingOptions**
   - Dynamic pricing configuration
   - Multiple pricing tiers
   - Time/day-based rules
   - Campaign management

4. **MenuStaffAssignment**
   - Staff-service mapping
   - Skill level configuration
   - Commission settings
   - Performance preferences

5. **MenuCategoryManager**
   - Category CRUD operations
   - Color customization
   - Order management
   - Display preferences

6. **MenuBulkActions**
   - Multi-select operations
   - Batch price updates
   - Category changes
   - Activation/deactivation

## Database Schema

### Enhanced treatment_menus Table
```sql
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key)
- name: VARCHAR(255)
- price: DECIMAL(10, 2)
- duration_minutes: INTEGER
- description: TEXT
- category: VARCHAR(100)
- is_active: BOOLEAN
- image_url: TEXT
- display_order: INTEGER
- popularity_score: INTEGER (0-100)
- booking_count: INTEGER
- member_price: DECIMAL(10, 2)
- peak_price: DECIMAL(10, 2)
- off_peak_price: DECIMAL(10, 2)
- tags: TEXT[]
- is_online_bookable: BOOLEAN
- is_featured: BOOLEAN
- min_advance_booking_hours: INTEGER
- max_advance_booking_days: INTEGER
```

### Related Tables
- **menu_categories**: Custom category management
- **menu_pricing_options**: Dynamic pricing rules
- **staff_menu_assignments**: Staff-service relationships
- **menu_analytics**: Performance tracking

## Usage Examples

### Adding a New Service
```typescript
1. Click "新規メニュー追加" button
2. Fill in basic information:
   - Service name
   - Category
   - Base price
   - Duration
3. Add optional details:
   - Description
   - Service image
   - Tags for searchability
4. Configure booking settings:
   - Online availability
   - Advance booking rules
5. Save the service
```

### Setting Up Dynamic Pricing
```typescript
1. Select a service
2. Click "価格設定" (Pricing Settings)
3. Add pricing options:
   - Member discount (e.g., 10% off)
   - Happy hour pricing (e.g., 15:00-17:00)
   - Weekend rates
   - Campaign prices
4. Set conditions and validity periods
5. Save pricing rules
```

### Assigning Staff to Services
```typescript
1. Select a service
2. Click "スタッフ設定" (Staff Settings)
3. For each staff member:
   - Set skill level
   - Adjust service duration if needed
   - Configure commission rate
   - Add notes/restrictions
4. Save assignments
```

### Bulk Operations
```typescript
1. Select multiple services using checkboxes
2. Choose bulk action:
   - Update prices (percentage or fixed amount)
   - Change category
   - Activate/deactivate
   - Delete services
3. Confirm and apply changes
```

## Best Practices

### Service Organization
- Use clear, descriptive service names
- Maintain consistent category structure
- Add relevant tags for better searchability
- Keep descriptions concise but informative

### Pricing Strategy
- Set competitive base prices
- Use member pricing to encourage loyalty
- Implement time-based pricing for demand management
- Create attractive package deals

### Staff Management
- Accurately assess staff skill levels
- Adjust service times based on experience
- Set fair commission rates
- Regular performance reviews

### Image Guidelines
- Use high-quality service images
- Maintain consistent image dimensions
- Show actual service results when possible
- Update images regularly

## Analytics & Reporting

The system tracks:
- **Booking Frequency**: Most popular services
- **Revenue Generation**: Highest earning services
- **Staff Performance**: Service completion rates
- **Pricing Effectiveness**: Impact of dynamic pricing
- **Customer Preferences**: Service selection patterns

## Troubleshooting

### Common Issues

1. **Service Not Appearing**
   - Check if service is active
   - Verify category settings
   - Ensure proper display order

2. **Pricing Not Applied**
   - Verify pricing rule conditions
   - Check date/time validity
   - Ensure rules are active

3. **Staff Can't Be Assigned**
   - Verify staff account is active
   - Check staff permissions
   - Ensure proper skill level setting

## Future Enhancements

Planned features include:
- Service packages and bundles
- Automated pricing optimization
- Advanced analytics dashboard
- Customer preference learning
- Inventory integration
- Multi-location support

## API Integration

The menu management system integrates with:
- Booking system for real-time availability
- Payment processing for accurate pricing
- Staff scheduling for assignment validation
- Analytics platform for performance tracking
- Marketing tools for promotion management