const express = require('express');
const router = express.Router();
const { tenantService } = require('../services/supabase');
const { validationResult } = require('express-validator');
const { requireRole } = require('../middleware/supabase-auth');

/**
 * @route   GET /api/settings
 * @desc    Get tenant settings
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const tenant = await tenantService.findById(req.user.tenantId);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone_number: tenant.phone_number,
      address: tenant.address,
      plan_type: tenant.plan_type,
      settings: tenant.settings || {},
      created_at: tenant.created_at,
      updated_at: tenant.updated_at
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * @route   PUT /api/settings
 * @desc    Update tenant settings
 * @access  Private (Owner/Admin only)
 */
router.put('/', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const allowedFields = ['name', 'email', 'phone_number', 'address'];
    const updates = {};

    // Filter allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const tenant = await tenantService.update(req.user.tenantId, updates);

    res.json({
      message: 'Settings updated successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone_number: tenant.phone_number,
        address: tenant.address,
        plan_type: tenant.plan_type
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * @route   PUT /api/settings/preferences
 * @desc    Update tenant preferences (JSON settings)
 * @access  Private (Owner/Admin only)
 */
router.put('/preferences', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const preferences = req.body;

    const tenant = await tenantService.updateSettings(
      req.user.tenantId,
      preferences
    );

    res.json({
      message: 'Preferences updated successfully',
      settings: tenant.settings
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * @route   GET /api/settings/business-hours
 * @desc    Get business hours
 * @access  Private
 */
router.get('/business-hours', async (req, res) => {
  try {
    const businessHours = await tenantService.getBusinessHours(req.user.tenantId);

    // Format response with day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formatted = businessHours.map(hour => ({
      ...hour,
      day_name: dayNames[hour.day_of_week]
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get business hours error:', error);
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
});

/**
 * @route   PUT /api/settings/business-hours
 * @desc    Update business hours
 * @access  Private (Owner/Admin only)
 */
router.put('/business-hours', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { businessHours } = req.body;

    if (!businessHours || !Array.isArray(businessHours)) {
      return res.status(400).json({ error: 'Invalid business hours format' });
    }

    // Validate each day
    for (const hour of businessHours) {
      if (typeof hour.day_of_week !== 'number' || hour.day_of_week < 0 || hour.day_of_week > 6) {
        return res.status(400).json({ error: 'Invalid day of week' });
      }
    }

    const updated = await tenantService.updateBusinessHours(
      req.user.tenantId,
      businessHours
    );

    res.json({
      message: 'Business hours updated successfully',
      businessHours: updated
    });
  } catch (error) {
    console.error('Update business hours error:', error);
    res.status(500).json({ error: 'Failed to update business hours' });
  }
});

/**
 * @route   GET /api/settings/holidays
 * @desc    Get holidays
 * @access  Private
 */
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await tenantService.getHolidays(req.user.tenantId);

    res.json(holidays);
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

/**
 * @route   POST /api/settings/holidays
 * @desc    Add holiday
 * @access  Private (Owner/Admin only)
 */
router.post('/holidays', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const { holiday_type, date, day_of_week, name } = req.body;

    if (!holiday_type || !['regular', 'temporary'].includes(holiday_type)) {
      return res.status(400).json({ error: 'Invalid holiday type' });
    }

    if (holiday_type === 'temporary' && !date) {
      return res.status(400).json({ error: 'Date is required for temporary holidays' });
    }

    if (holiday_type === 'regular' && (day_of_week === undefined || day_of_week < 0 || day_of_week > 6)) {
      return res.status(400).json({ error: 'Valid day of week is required for regular holidays' });
    }

    const holiday = await tenantService.addHoliday(req.user.tenantId, {
      holiday_type,
      date,
      day_of_week,
      name,
      is_active: true
    });

    res.status(201).json({
      message: 'Holiday added successfully',
      holiday
    });
  } catch (error) {
    console.error('Add holiday error:', error);
    res.status(500).json({ error: 'Failed to add holiday' });
  }
});

/**
 * @route   DELETE /api/settings/holidays/:id
 * @desc    Delete holiday
 * @access  Private (Owner/Admin only)
 */
router.delete('/holidays/:id', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    // Soft delete by marking as inactive
    await tenantService.supabase
      .from('holiday_settings')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenantId);

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

/**
 * @route   GET /api/settings/plan
 * @desc    Get plan information and usage
 * @access  Private
 */
router.get('/plan', async (req, res) => {
  try {
    const tenant = await tenantService.findById(req.user.tenantId);
    const usage = await tenantService.getUsageStats(req.user.tenantId);

    // Define plan limits
    const planLimits = {
      light: {
        customers: 100,
        reservations: 500,
        messages: 1000,
        ai_replies: 50
      },
      standard: {
        customers: 500,
        reservations: 2000,
        messages: 5000,
        ai_replies: 200
      },
      premium: {
        customers: null, // unlimited
        reservations: null,
        messages: null,
        ai_replies: 1000
      }
    };

    const currentPlan = tenant.plan_type;
    const limits = planLimits[currentPlan];

    res.json({
      plan: {
        type: currentPlan,
        name: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) + ' Plan',
        limits
      },
      usage: {
        customers: {
          used: usage.customers_count,
          limit: limits.customers,
          percentage: limits.customers ? Math.round((usage.customers_count / limits.customers) * 100) : 0
        },
        reservations: {
          used: usage.reservations_count,
          limit: limits.reservations,
          percentage: limits.reservations ? Math.round((usage.reservations_count / limits.reservations) * 100) : 0
        },
        messages: {
          used: usage.messages_sent,
          limit: limits.messages,
          percentage: limits.messages ? Math.round((usage.messages_sent / limits.messages) * 100) : 0
        },
        ai_replies: {
          used: usage.ai_replies_count,
          limit: limits.ai_replies,
          percentage: limits.ai_replies ? Math.round((usage.ai_replies_count / limits.ai_replies) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get plan info error:', error);
    res.status(500).json({ error: 'Failed to fetch plan information' });
  }
});

/**
 * @route   PUT /api/settings/plan
 * @desc    Upgrade/downgrade plan
 * @access  Private (Owner only)
 */
router.put('/plan', requireRole('owner'), async (req, res) => {
  try {
    const { planType } = req.body;

    if (!['light', 'standard', 'premium'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    const tenant = await tenantService.updatePlan(req.user.tenantId, planType);

    res.json({
      message: 'Plan updated successfully',
      plan: {
        type: tenant.plan_type,
        name: tenant.plan_type.charAt(0).toUpperCase() + tenant.plan_type.slice(1) + ' Plan'
      }
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

/**
 * @route   GET /api/settings/reminder-configs
 * @desc    Get reminder configurations
 * @access  Private
 */
router.get('/reminder-configs', async (req, res) => {
  try {
    const { data, error } = await tenantService.supabase
      .from('reminder_configs')
      .select('*')
      .eq('tenant_id', req.user.tenantId)
      .eq('is_active', true)
      .order('reminder_type');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Get reminder configs error:', error);
    res.status(500).json({ error: 'Failed to fetch reminder configurations' });
  }
});

/**
 * @route   PUT /api/settings/reminder-configs/:id
 * @desc    Update reminder configuration
 * @access  Private (Owner/Admin only)
 */
router.put('/reminder-configs/:id', requireRole(['owner', 'admin']), async (req, res) => {
  try {
    const updates = req.body;
    delete updates.id;
    delete updates.tenant_id;

    const { data, error } = await tenantService.supabase
      .from('reminder_configs')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenantId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Reminder configuration updated successfully',
      config: data
    });
  } catch (error) {
    console.error('Update reminder config error:', error);
    res.status(500).json({ error: 'Failed to update reminder configuration' });
  }
});

module.exports = router;