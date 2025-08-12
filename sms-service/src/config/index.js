require('dotenv').config();

/**
 * Application Configuration
 */
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'sms_service',
    user: process.env.DB_USER || 'sms_user',
    password: process.env.DB_PASSWORD || 'sms_password'
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '24h'
  },

  // Rate limiting
  rateLimiting: {
    defaultLimit: parseInt(process.env.DEFAULT_RATE_LIMIT) || 100,
    premiumLimit: parseInt(process.env.PREMIUM_RATE_LIMIT) || 1000
  },

  // SMS Providers configuration
  providers: {
    twilio: {
      enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      default: process.env.DEFAULT_SMS_PROVIDER === 'twilio'
    },
    'aws-sns': {
      enabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      default: process.env.DEFAULT_SMS_PROVIDER === 'aws-sns'
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },

  // Security configuration
  security: {
    adminApiKey: process.env.ADMIN_API_KEY,
    webhookSecret: process.env.WEBHOOK_SECRET
  },

  // Queue configuration
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 5,
    retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY) || 5000
  },

  // Application features
  features: {
    enableBulkSMS: process.env.ENABLE_BULK_SMS !== 'false',
    enableWebhooks: process.env.ENABLE_WEBHOOKS !== 'false',
    enableMetrics: process.env.ENABLE_METRICS !== 'false'
  }
};

// Validate required configuration
function validateConfig() {
  const errors = [];

  // Check if at least one SMS provider is configured
  const enabledProviders = Object.values(config.providers).filter(p => p.enabled);
  if (enabledProviders.length === 0) {
    errors.push('At least one SMS provider must be configured');
  }

  // Check admin API key in production
  if (config.server.env === 'production' && !config.security.adminApiKey) {
    errors.push('ADMIN_API_KEY must be set in production');
  }

  // Check JWT secret in production
  if (config.server.env === 'production' && config.jwt.secret === 'default-secret-change-in-production') {
    errors.push('JWT_SECRET must be changed in production');
  }

  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }
}

// Set default provider if none is specified
function setDefaultProvider() {
  const providers = config.providers;
  let defaultSet = false;

  // Check if any provider is explicitly set as default
  for (const [name, providerConfig] of Object.entries(providers)) {
    if (providerConfig.enabled && providerConfig.default) {
      defaultSet = true;
      break;
    }
  }

  // If no default is set, use the first enabled provider
  if (!defaultSet) {
    for (const [name, providerConfig] of Object.entries(providers)) {
      if (providerConfig.enabled) {
        providerConfig.default = true;
        console.log(`Set ${name} as default SMS provider`);
        break;
      }
    }
  }
}

// Initialize configuration
validateConfig();
setDefaultProvider();

module.exports = config;