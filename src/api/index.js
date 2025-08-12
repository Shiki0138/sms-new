const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import routes
const smsRoutes = require('../routes/sms-routes');
const authRoutes = require('../routes/auth-routes');
const customerRoutes = require('../routes/customer-routes');
const appointmentRoutes = require('../routes/appointment-routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../../public')));

// API routes
app.use('/api/sms', smsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SMS System API',
    version: '1.0.0'
  });
});

// Serve main app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

module.exports = app;