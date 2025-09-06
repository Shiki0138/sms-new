// Public Booking API Routes
// Used by the embeddable booking widget

const express = require('express');
const router = express.Router({ mergeParams: true });
const Salon = require('../models/Salon');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Subscription = require('../models/Subscription');
const { hasFeature, isWithinLimit } = require('../config/plans');
const moment = require('moment');

// Middleware to verify API key
const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const salonId = req.params.salonId;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required'
    });
  }
  
  try {
    const salon = await Salon.findById(salonId);
    
    if (!salon) {
      return res.status(404).json({
        success: false,
        error: 'Salon not found'
      });
    }
    
    // Verify API key
    if (salon.apiKey !== apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    // Check if salon has active subscription with booking widget feature
    const subscription = await Subscription.findOne({ 
      salon: salonId,
      status: 'active'
    });
    
    if (!subscription || !hasFeature(subscription.planId, 'bookingWidget')) {
      return res.status(403).json({
        success: false,
        error: 'Booking widget not available in current plan'
      });
    }
    
    req.salon = salon;
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('API key verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify API key'
    });
  }
};

// Get salon services
router.get('/services', verifyApiKey, async (req, res) => {
  try {
    const services = await Service.find({
      salon: req.params.salonId,
      isActive: true
    }).select('name description duration price category');
    
    res.json({
      success: true,
      services
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services'
    });
  }
});

// Get salon staff
router.get('/staff', verifyApiKey, async (req, res) => {
  try {
    const staff = await Staff.find({
      salon: req.params.salonId,
      isActive: true
    }).select('name title photo specialties');
    
    res.json({
      success: true,
      staff
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff'
    });
  }
});

// Get availability
router.get('/availability', verifyApiKey, async (req, res) => {
  try {
    const { date, service: serviceId, staff: staffId } = req.query;
    
    if (!date || !serviceId) {
      return res.status(400).json({
        success: false,
        error: 'Date and service are required'
      });
    }
    
    // Get service details for duration
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }
    
    // Get salon business hours
    const dayOfWeek = moment(date).format('dddd').toLowerCase();
    const businessHours = req.salon.businessHours[dayOfWeek];
    
    if (!businessHours || !businessHours.isOpen) {
      return res.json({
        success: true,
        slots: []
      });
    }
    
    // Get existing appointments for the date
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();
    
    const query = {
      salon: req.params.salonId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['confirmed', 'pending'] }
    };
    
    if (staffId) {
      query.staff = staffId;
    }
    
    const appointments = await Appointment.find(query)
      .select('startTime endTime staff');
    
    // Generate time slots
    const slots = [];
    const openTime = moment(`${date} ${businessHours.open}`, 'YYYY-MM-DD HH:mm');
    const closeTime = moment(`${date} ${businessHours.close}`, 'YYYY-MM-DD HH:mm');
    const slotDuration = 30; // 30-minute slots
    
    let currentSlot = openTime.clone();
    
    while (currentSlot.isBefore(closeTime)) {
      const slotEnd = currentSlot.clone().add(service.duration, 'minutes');
      
      // Check if slot fits within business hours
      if (slotEnd.isAfter(closeTime)) {
        break;
      }
      
      // Check availability
      let isAvailable = true;
      
      for (const apt of appointments) {
        const aptStart = moment(apt.startTime);
        const aptEnd = moment(apt.endTime);
        
        // Check for overlap
        if (
          (currentSlot.isSameOrAfter(aptStart) && currentSlot.isBefore(aptEnd)) ||
          (slotEnd.isAfter(aptStart) && slotEnd.isSameOrBefore(aptEnd)) ||
          (currentSlot.isSameOrBefore(aptStart) && slotEnd.isSameOrAfter(aptEnd))
        ) {
          if (!staffId || apt.staff.toString() === staffId) {
            isAvailable = false;
            break;
          }
        }
      }
      
      // Check if slot is in the past
      if (currentSlot.isBefore(moment())) {
        isAvailable = false;
      }
      
      slots.push({
        time: currentSlot.format('HH:mm'),
        available: isAvailable
      });
      
      currentSlot.add(slotDuration, 'minutes');
    }
    
    res.json({
      success: true,
      slots
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
});

// Create booking
router.post('/bookings', verifyApiKey, async (req, res) => {
  try {
    const {
      service: serviceId,
      staff: staffId,
      date,
      time,
      customer,
      notes
    } = req.body;
    
    // Validate required fields
    if (!serviceId || !date || !time || !customer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Check booking limit
    const currentBookings = await Appointment.countDocuments({
      salon: req.params.salonId,
      date: {
        $gte: moment().startOf('month').toDate(),
        $lte: moment().endOf('month').toDate()
      }
    });
    
    if (!isWithinLimit(req.subscription.planId, 'maxMonthlyBookings', currentBookings)) {
      return res.status(403).json({
        success: false,
        error: 'Monthly booking limit reached. Please contact the salon directly.'
      });
    }
    
    // Get or create customer
    let existingCustomer = await Customer.findOne({
      salon: req.params.salonId,
      $or: [
        { email: customer.email },
        { phone: customer.phone }
      ]
    });
    
    if (!existingCustomer) {
      existingCustomer = new Customer({
        salon: req.params.salonId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        source: 'online_booking'
      });
      await existingCustomer.save();
    }
    
    // Get service details
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }
    
    // Create appointment
    const startTime = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm').toDate();
    const endTime = moment(startTime).add(service.duration, 'minutes').toDate();
    
    const appointment = new Appointment({
      salon: req.params.salonId,
      customer: existingCustomer._id,
      service: serviceId,
      staff: staffId || null,
      date: moment(date).toDate(),
      startTime,
      endTime,
      status: 'pending',
      notes,
      source: 'booking_widget',
      bookingNumber: generateBookingNumber()
    });
    
    await appointment.save();
    
    // Update subscription usage
    await req.subscription.incrementUsage('bookings');
    
    // Send confirmation SMS if enabled
    const smsService = req.app.get('smsRemindersService');
    if (smsService) {
      await smsService.sendAppointmentConfirmation(appointment);
    }
    
    // Populate appointment details for response
    await appointment.populate('service customer');
    
    res.json({
      success: true,
      booking: {
        id: appointment._id,
        bookingNumber: appointment.bookingNumber,
        service: appointment.service.name,
        date: moment(appointment.date).format('YYYY-MM-DD'),
        time: moment(appointment.startTime).format('HH:mm'),
        customer: {
          name: appointment.customer.name,
          email: appointment.customer.email
        }
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create booking'
    });
  }
});

// Generate booking number
function generateBookingNumber() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `BK${timestamp}${random}`.toUpperCase();
}

module.exports = router;