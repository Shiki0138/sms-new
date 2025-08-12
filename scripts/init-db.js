#!/usr/bin/env node

require('dotenv').config();
const { sequelize, User, Setting } = require('../src/models');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

async function initDatabase() {
  try {
    logger.info('Initializing database...');

    // Test connection
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Sync all models
    await sequelize.sync({ force: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized');

    // Create test user if in development
    if (process.env.NODE_ENV === 'development') {
      const testUser = await User.findOne({ where: { email: 'test@salon-lumiere.com' } });
      
      if (!testUser) {
        const user = await User.create({
          email: 'test@salon-lumiere.com',
          password: 'password123',
          name: 'テストユーザー',
          salonName: 'テストサロン',
          phoneNumber: '090-1234-5678',
          planType: 'light',
          emailVerified: true
        });

        await Setting.create({
          userId: user.id
        });

        logger.info('Test user created:');
        logger.info('Email: test@salon-lumiere.com');
        logger.info('Password: password123');
      }
    }

    logger.info('Database initialization completed');
    process.exit(0);
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();