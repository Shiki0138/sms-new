// Google Calendar Routes
// Handles OAuth flow and calendar synchronization

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { checkPlanFeature } = require('../middleware/planRestrictions');
const { getGoogleCalendarService } = require('../services/googleCalendar');
const Salon = require('../models/Salon');
const Appointment = require('../models/Appointment');

const googleCalendar = getGoogleCalendarService();

// Check if Google Calendar is enabled (Light plan and above)
router.use(authenticate, checkPlanFeature('googleCalendarSync'));

// Get Google Calendar connection status
router.get('/status', async (req, res) => {
  try {
    const salon = await Salon.findById(req.user.salonId);
    
    const isConnected = !!(salon.integrations?.googleCalendar?.refreshToken);
    const lastSync = salon.integrations?.googleCalendar?.lastSync;
    
    res.json({
      success: true,
      connected: isConnected,
      lastSync: lastSync,
      email: salon.integrations?.googleCalendar?.email || null
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check calendar status'
    });
  }
});

// Start OAuth flow
router.get('/connect', async (req, res) => {
  try {
    const authUrl = googleCalendar.getAuthUrl(req.user.salonId);
    
    res.json({
      success: true,
      authUrl: authUrl
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start Google Calendar connection'
    });
  }
});

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state: salonId } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code missing'
      });
    }
    
    // Exchange code for tokens
    const tokens = await googleCalendar.getTokens(code);
    
    // Get user info
    googleCalendar.setCredentials(tokens);
    const oauth2 = googleCalendar.oauth2Client;
    const userInfo = await oauth2.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = userInfo.getPayload();
    
    // Save tokens to salon
    await Salon.findByIdAndUpdate(salonId, {
      'integrations.googleCalendar': {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        email: payload.email,
        connectedAt: new Date(),
        lastSync: null
      }
    });
    
    // Redirect to success page
    res.redirect('/admin/settings/integrations?google=connected');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/admin/settings/integrations?google=error');
  }
});

// Disconnect Google Calendar
router.post('/disconnect', async (req, res) => {
  try {
    const salon = await Salon.findById(req.user.salonId);
    
    if (salon.integrations?.googleCalendar?.refreshToken) {
      // Revoke access
      try {
        await googleCalendar.revokeAccess({
          access_token: salon.integrations.googleCalendar.accessToken
        });
      } catch (error) {
        console.error('Error revoking Google access:', error);
      }
    }
    
    // Remove integration data
    await Salon.findByIdAndUpdate(req.user.salonId, {
      $unset: { 'integrations.googleCalendar': 1 }
    });
    
    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Google Calendar'
    });
  }
});

// Sync single appointment
router.post('/sync/appointment/:appointmentId', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate('service')
      .populate('staff')
      .populate('customer')
      .populate('salon');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    const salon = await Salon.findById(req.user.salonId);
    const tokens = salon.integrations?.googleCalendar;
    
    if (!tokens?.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Calendar not connected'
      });
    }
    
    // Refresh token if needed
    if (tokens.expiryDate < Date.now()) {
      const newTokens = await googleCalendar.refreshAccessToken(tokens.refreshToken);
      tokens.accessToken = newTokens.access_token;
      tokens.expiryDate = newTokens.expiry_date;
      
      await Salon.findByIdAndUpdate(salon._id, {
        'integrations.googleCalendar.accessToken': newTokens.access_token,
        'integrations.googleCalendar.expiryDate': newTokens.expiry_date
      });
    }
    
    let calendarEvent;
    
    if (appointment.googleEventId) {
      // Update existing event
      calendarEvent = await googleCalendar.updateAppointmentEvent(
        appointment.googleEventId,
        appointment,
        tokens
      );
    } else {
      // Create new event
      calendarEvent = await googleCalendar.createAppointmentEvent(
        appointment,
        tokens
      );
      
      // Save event ID
      appointment.googleEventId = calendarEvent.id;
      await appointment.save();
    }
    
    res.json({
      success: true,
      message: 'Appointment synced to Google Calendar',
      eventId: calendarEvent.id,
      eventLink: calendarEvent.htmlLink
    });
  } catch (error) {
    console.error('Error syncing appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync appointment'
    });
  }
});

// Bulk sync appointments
router.post('/sync/bulk', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const salon = await Salon.findById(req.user.salonId);
    const tokens = salon.integrations?.googleCalendar;
    
    if (!tokens?.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Calendar not connected'
      });
    }
    
    // Get appointments in date range
    const appointments = await Appointment.find({
      salon: req.user.salonId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      status: { $in: ['confirmed', 'pending'] }
    })
    .populate('service')
    .populate('staff')
    .populate('customer');
    
    // Sync appointments
    const results = await googleCalendar.batchSyncAppointments(appointments, tokens);
    
    // Update last sync time
    await Salon.findByIdAndUpdate(req.user.salonId, {
      'integrations.googleCalendar.lastSync': new Date()
    });
    
    res.json({
      success: true,
      message: `Synced ${appointments.length} appointments`,
      syncedCount: appointments.length
    });
  } catch (error) {
    console.error('Error in bulk sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync appointments'
    });
  }
});

// Get calendar availability
router.get('/availability', async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Date, start time, and end time are required'
      });
    }
    
    const salon = await Salon.findById(req.user.salonId);
    const tokens = salon.integrations?.googleCalendar;
    
    if (!tokens?.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Calendar not connected'
      });
    }
    
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    
    const isAvailable = await googleCalendar.checkAvailability(start, end, tokens);
    
    res.json({
      success: true,
      available: isAvailable,
      date: date,
      startTime: startTime,
      endTime: endTime
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability'
    });
  }
});

// Auto-sync settings
router.put('/settings/auto-sync', async (req, res) => {
  try {
    const { enabled, syncInterval } = req.body;
    
    await Salon.findByIdAndUpdate(req.user.salonId, {
      'integrations.googleCalendar.autoSync': enabled,
      'integrations.googleCalendar.syncInterval': syncInterval || 15 // minutes
    });
    
    res.json({
      success: true,
      message: 'Auto-sync settings updated',
      autoSync: enabled,
      syncInterval: syncInterval
    });
  } catch (error) {
    console.error('Error updating auto-sync settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

module.exports = router;