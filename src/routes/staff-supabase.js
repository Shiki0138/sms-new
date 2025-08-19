const express = require('express');
const router = express.Router();
const { staffService } = require('../services/supabase');
const { validationResult } = require('express-validator');
const { 
  validateStaffCreate, 
  validateStaffUpdate 
} = require('../middleware/validation');
const { requireRole } = require('../middleware/supabase-auth');

/**
 * @route   GET /api/staff
 * @desc    Get all staff members
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { active = 'true', skills } = req.query;

    const options = {
      tenantId: req.user.tenantId,
      orderBy: 'name',
      orderDirection: 'asc'
    };

    if (active === 'true') {
      options.filters = { is_active: true };
    }

    const staff = await staffService.findAll(options);

    // Filter by skills if provided
    if (skills) {
      const requiredSkills = Array.isArray(skills) ? skills : skills.split(',');
      staff.data = staff.data.filter(member => 
        requiredSkills.every(skill => member.skills?.includes(skill))
      );
    }

    res.json(staff.data);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

/**
 * @route   GET /api/staff/:id
 * @desc    Get single staff member
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const staff = await staffService.findById(req.params.id, {
      tenantId: req.user.tenantId
    });

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Get performance stats
    const stats = await staffService.getPerformanceStats(req.params.id);

    res.json({
      ...staff,
      stats
    });
  } catch (error) {
    console.error('Get staff member error:', error);
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
});

/**
 * @route   POST /api/staff
 * @desc    Create new staff member
 * @access  Private (Owner/Admin only)
 */
router.post('/', 
  requireRole(['owner', 'admin']), 
  validateStaffCreate, 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const staffData = {
        ...req.body,
        tenant_id: req.user.tenantId
      };

      const staff = await staffService.create(staffData);

      res.status(201).json({
        message: 'Staff member created successfully',
        staff
      });
    } catch (error) {
      console.error('Create staff error:', error);
      res.status(500).json({ error: 'Failed to create staff member' });
    }
});

/**
 * @route   PUT /api/staff/:id
 * @desc    Update staff member
 * @access  Private (Owner/Admin only)
 */
router.put('/:id', 
  requireRole(['owner', 'admin']), 
  validateStaffUpdate, 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if staff exists
      const existing = await staffService.findById(req.params.id, {
        tenantId: req.user.tenantId
      });

      if (!existing) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      const staff = await staffService.update(req.params.id, req.body, {
        tenantId: req.user.tenantId
      });

      res.json({
        message: 'Staff member updated successfully',
        staff
      });
    } catch (error) {
      console.error('Update staff error:', error);
      res.status(500).json({ error: 'Failed to update staff member' });
    }
});

/**
 * @route   DELETE /api/staff/:id
 * @desc    Delete staff member (soft delete by deactivating)
 * @access  Private (Owner only)
 */
router.delete('/:id', requireRole('owner'), async (req, res) => {
  try {
    // Soft delete by deactivating
    const staff = await staffService.setActiveStatus(req.params.id, false);

    res.json({
      message: 'Staff member deactivated successfully',
      staff
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});

/**
 * @route   PUT /api/staff/:id/activate
 * @desc    Activate staff member
 * @access  Private (Owner/Admin only)
 */
router.put('/:id/activate', 
  requireRole(['owner', 'admin']), 
  async (req, res) => {
    try {
      const staff = await staffService.setActiveStatus(req.params.id, true);

      res.json({
        message: 'Staff member activated successfully',
        staff
      });
    } catch (error) {
      console.error('Activate staff error:', error);
      res.status(500).json({ error: 'Failed to activate staff member' });
    }
});

/**
 * @route   PUT /api/staff/:id/working-hours
 * @desc    Update staff working hours
 * @access  Private (Owner/Admin only)
 */
router.put('/:id/working-hours', 
  requireRole(['owner', 'admin']), 
  async (req, res) => {
    try {
      const { workingHours } = req.body;

      if (!workingHours || typeof workingHours !== 'object') {
        return res.status(400).json({ error: 'Invalid working hours format' });
      }

      const staff = await staffService.updateWorkingHours(
        req.params.id, 
        workingHours
      );

      res.json({
        message: 'Working hours updated successfully',
        staff
      });
    } catch (error) {
      console.error('Update working hours error:', error);
      res.status(500).json({ error: 'Failed to update working hours' });
    }
});

/**
 * @route   GET /api/staff/:id/schedule
 * @desc    Get staff schedule
 * @access  Private
 */
router.get('/:id/schedule', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const schedule = await staffService.getSchedule(
      req.params.id,
      startDate,
      endDate
    );

    res.json(schedule);
  } catch (error) {
    console.error('Get staff schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch staff schedule' });
  }
});

/**
 * @route   GET /api/staff/:id/availability
 * @desc    Check staff availability
 * @access  Private
 */
router.get('/:id/availability', async (req, res) => {
  try {
    const { date, time, duration } = req.query;

    if (!date || !time || !duration) {
      return res.status(400).json({ 
        error: 'Date, time, and duration are required' 
      });
    }

    const isAvailable = await staffService.checkAvailability(
      req.params.id,
      date,
      time,
      parseInt(duration)
    );

    res.json({ available: isAvailable });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

/**
 * @route   GET /api/staff/available
 * @desc    Get available staff for a service
 * @access  Private
 */
router.get('/available', async (req, res) => {
  try {
    const { serviceId, date, time, duration } = req.query;

    if (!serviceId || !date || !time) {
      return res.status(400).json({ 
        error: 'Service ID, date, and time are required' 
      });
    }

    const availableStaff = await staffService.getAvailableStaff({
      serviceId,
      date,
      time,
      duration: duration ? parseInt(duration) : null,
      tenantId: req.user.tenantId
    });

    res.json(availableStaff);
  } catch (error) {
    console.error('Get available staff error:', error);
    res.status(500).json({ error: 'Failed to fetch available staff' });
  }
});

/**
 * @route   GET /api/staff/:id/performance
 * @desc    Get staff performance metrics
 * @access  Private
 */
router.get('/:id/performance', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const performance = await staffService.getPerformanceStats(
      req.params.id,
      period
    );

    res.json(performance);
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

/**
 * @route   PUT /api/staff/:id/skills
 * @desc    Update staff skills
 * @access  Private (Owner/Admin only)
 */
router.put('/:id/skills', 
  requireRole(['owner', 'admin']), 
  async (req, res) => {
    try {
      const { skills } = req.body;

      if (!skills || !Array.isArray(skills)) {
        return res.status(400).json({ error: 'Skills must be an array' });
      }

      const staff = await staffService.update(req.params.id, { skills }, {
        tenantId: req.user.tenantId
      });

      res.json({
        message: 'Skills updated successfully',
        staff
      });
    } catch (error) {
      console.error('Update skills error:', error);
      res.status(500).json({ error: 'Failed to update skills' });
    }
});

module.exports = router;