#!/usr/bin/env node

/**
 * SMS System Server
 * Main entry point for the SMS management system
 */

require('dotenv').config();
const app = require('./app');
const SMSService = require('../sms-service/src/services/sms-service');
const config = require('../sms-service/src/config');

// Set port from environment or default
const PORT = process.env.PORT || config.server.port || 3001;
const HOST = process.env.HOST || config.server.host || '0.0.0.0';

// Initialize SMS service
let smsService;

/**
 * Start the server
 */
async function startServer() {
  try {
    console.log('🚀 Starting SMS System Server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Host: ${HOST}`);
    console.log(`Port: ${PORT}`);

    // Initialize SMS service
    console.log('📱 Initializing SMS Service...');
    smsService = new SMSService(config);
    await smsService.initialize();
    
    console.log('✅ SMS Service initialized successfully');

    // Initialize default users
    const { initializeDefaultUsers } = require('./models/userModel');
    await initializeDefaultUsers();

    // Validate configuration
    console.log('🔍 Validating configuration...');
    validateConfiguration();
    
    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      console.log(`🌟 SMS System Server is running on http://${HOST}:${PORT}`);
      console.log(`📚 API Documentation: http://${HOST}:${PORT}/api`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log('🎯 Ready to process SMS requests!');
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`);
      
      // Stop accepting new connections
      server.close(async () => {
        console.log('🔌 HTTP server closed');
        
        // Shutdown SMS service
        if (smsService) {
          console.log('📱 Shutting down SMS service...');
          await smsService.shutdown();
          console.log('✅ SMS service shutdown complete');
        }
        
        console.log('👋 Server shutdown complete');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Validate server configuration
 */
function validateConfiguration() {
  const requiredEnvVars = [];
  const warnings = [];

  // Check SMS providers
  const hasProvider = !!(
    (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) ||
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  );
  
  if (!hasProvider) {
    requiredEnvVars.push('At least one SMS provider must be configured (Twilio or AWS SNS)');
  }

  // Check production settings
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default-secret-change-in-production') {
      requiredEnvVars.push('JWT_SECRET must be set in production');
    }
    
    if (!process.env.ADMIN_API_KEY) {
      warnings.push('ADMIN_API_KEY is not set - admin endpoints will be disabled');
    }
    
    if (!process.env.REDIS_HOST) {
      warnings.push('REDIS_HOST is not set - using localhost (may cause issues in production)');
    }
  }

  // Display warnings
  if (warnings.length > 0) {
    console.log('⚠️  Configuration warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  // Check required variables
  if (requiredEnvVars.length > 0) {
    console.error('❌ Configuration errors:');
    requiredEnvVars.forEach(error => console.error(`   - ${error}`));
    throw new Error('Invalid configuration');
  }

  console.log('✅ Configuration validation passed');
}

/**
 * Display startup banner
 */
function displayBanner() {
  const banner = `
╔═══════════════════════════════════════╗
║           SMS SYSTEM SERVER           ║
║                                       ║
║  🚀 Multi-Provider SMS Management     ║
║  📱 Queue-Based Processing            ║
║  🏢 Multi-Tenant Support              ║
║  📊 Analytics & Monitoring            ║
║  🔐 Enterprise Security               ║
╚═══════════════════════════════════════╝
  `;
  
  console.log(banner);
}

// Display banner and start server
displayBanner();
startServer().catch(error => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});