const express = require('express');
const router = express.Router();
const { 
  tenantService, 
  serviceService, 
  staffService, 
  reservationService,
  customerService 
} = require('../services/supabase');
const { validationResult } = require('express-validator');
const { validatePublicBooking } = require('../middleware/validation');

/**
 * @route   GET /api/public/booking/info/:tenantId
 * @desc    Get public booking information for a tenant
 * @access  Public
 */
router.get('/info/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Get tenant info
    const tenant = await tenantService.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Get business hours
    const businessHours = await tenantService.getBusinessHours(tenantId);

    // Get active services
    const services = await serviceService.findActiveByTenant(tenantId);

    // Get active staff
    const staff = await staffService.findActiveByTenant(tenantId);

    res.json({
      business: {
        id: tenant.id,
        name: tenant.name,
        address: tenant.address,
        phone_number: tenant.phone_number
      },
      businessHours: businessHours.filter(h => h.is_open),
      services: services.data.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        duration: s.duration,
        price: s.price,
        description: s.description
      })),
      staff: staff.data.map(s => ({
        id: s.id,
        name: s.name,
        role: s.role
      }))
    });
  } catch (error) {
    console.error('Get booking info error:', error);
    res.status(500).json({ error: 'Failed to fetch booking information' });
  }
});

/**
 * @route   GET /api/public/booking/available-slots
 * @desc    Get available booking slots
 * @access  Public
 */
router.get('/available-slots', async (req, res) => {
  try {
    const { tenantId, serviceId, staffId, date } = req.query;

    if (!tenantId || !serviceId || !date) {
      return res.status(400).json({ 
        error: 'Tenant ID, service ID, and date are required' 
      });
    }

    // Get available slots
    const slots = await reservationService.getAvailableSlots({
      date,
      staffId,
      serviceId,
      tenantId
    });

    res.json(slots);
  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

/**
 * @route   GET /api/public/booking/available-staff
 * @desc    Get available staff for a service
 * @access  Public
 */
router.get('/available-staff', async (req, res) => {
  try {
    const { tenantId, serviceId, date, time } = req.query;

    if (!tenantId || !serviceId || !date || !time) {
      return res.status(400).json({ 
        error: 'All parameters are required' 
      });
    }

    const availableStaff = await staffService.getAvailableStaff({
      serviceId,
      date,
      time,
      tenantId
    });

    res.json(availableStaff.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role
    })));
  } catch (error) {
    console.error('Get available staff error:', error);
    res.status(500).json({ error: 'Failed to fetch available staff' });
  }
});

/**
 * @route   POST /api/public/booking/create
 * @desc    Create a booking (public)
 * @access  Public
 */
router.post('/create', validatePublicBooking, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      tenantId,
      serviceId,
      staffId,
      date,
      time,
      customerName,
      customerPhone,
      customerEmail,
      notes
    } = req.body;

    // Get service details
    const service = await serviceService.findById(serviceId);
    if (!service || service.tenant_id !== tenantId) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check or create customer
    let customer = await customerService.findOne(
      { phone_number: customerPhone },
      { tenantId }
    );

    if (!customer) {
      // Create new customer
      customer = await customerService.create({
        tenant_id: tenantId,
        name: customerName,
        phone_number: customerPhone,
        email: customerEmail
      });
    }

    // Create reservation
    const startTime = new Date(`${date} ${time}`);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    // Check availability
    const isAvailable = await reservationService.checkAvailability({
      staffId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    if (!isAvailable) {
      return res.status(409).json({ 
        error: 'This time slot is no longer available' 
      });
    }

    const reservation = await reservationService.create({
      tenant_id: tenantId,
      customer_id: customer.id,
      staff_id: staffId,
      service_id: serviceId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'confirmed',
      price: service.price,
      notes: notes || `Public booking by ${customerName}`,
      menu_content: service.name
    });

    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        id: reservation.id,
        date: date,
        time: time,
        service: service.name,
        duration: service.duration,
        price: service.price
      },
      customer: {
        name: customer.name,
        phone: customer.phone_number,
        email: customer.email
      }
    });
  } catch (error) {
    console.error('Create public booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

/**
 * @route   GET /api/public/booking/verify/:bookingId
 * @desc    Verify a booking
 * @access  Public
 */
router.get('/verify/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Get reservation with customer info
    const reservation = await reservationService.findById(bookingId, {
      select: '*, customers(*), services(*), staff(*)'
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify phone number matches
    if (reservation.customers.phone_number !== phone) {
      return res.status(403).json({ error: 'Invalid verification' });
    }

    res.json({
      booking: {
        id: reservation.id,
        status: reservation.status,
        date: reservation.start_time,
        service: reservation.services?.name || reservation.menu_content,
        staff: reservation.staff?.name,
        price: reservation.price
      },
      customer: {
        name: reservation.customers.name,
        phone: reservation.customers.phone_number
      }
    });
  } catch (error) {
    console.error('Verify booking error:', error);
    res.status(500).json({ error: 'Failed to verify booking' });
  }
});

/**
 * @route   POST /api/public/booking/cancel/:bookingId
 * @desc    Cancel a booking
 * @access  Public (with verification)
 */
router.post('/cancel/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { phone, reason } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Get reservation with customer info
    const reservation = await reservationService.findById(bookingId, {
      select: '*, customers(*)'
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Verify phone number matches
    if (reservation.customers.phone_number !== phone) {
      return res.status(403).json({ error: 'Invalid verification' });
    }

    // Check if already cancelled
    if (reservation.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Cancel the reservation
    await reservationService.updateStatus(bookingId, 'cancelled');

    // Add cancellation note
    if (reason) {
      await reservationService.update(bookingId, {
        notes: `${reservation.notes || ''}\nCancelled by customer: ${reason}`
      });
    }

    res.json({
      message: 'Booking cancelled successfully',
      bookingId: reservation.id
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;