const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('reminder', 'campaign', 'holiday', 'reengagement', 'custom'),
    allowNull: false
  },
  channels: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: ['email'] // ['email', 'line', 'instagram']
  },
  targetCriteria: {
    type: DataTypes.JSON,
    defaultValue: {}
    // Example: {
    //   lastVisitDays: { min: 60, max: null }, // Customers who haven't visited in 60+ days
    //   visitCount: { min: 3, max: null }, // Regular customers (3+ visits)
    //   tags: ['vip', 'premium'], // Specific customer tags
    //   birthMonth: 5, // May birthdays
    //   customQuery: null // Custom SQL conditions
    // }
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false
    // Example: {
    //   subject: 'Special Offer!', // For email
    //   body: 'Hello {{firstName}}, we miss you!',
    //   lineMessage: { type: 'text', text: '...' },
    //   instagramMessage: { caption: '...', mediaUrl: '...' }
    // }
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true // null for immediate send
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'),
    defaultValue: 'draft'
  },
  stats: {
    type: DataTypes.JSON,
    defaultValue: {
      totalRecipients: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0
    }
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurringSchedule: {
    type: DataTypes.JSON,
    allowNull: true
    // Example: {
    //   frequency: 'monthly', // daily, weekly, monthly
    //   dayOfWeek: 1, // 0-6 for weekly
    //   dayOfMonth: 15, // 1-31 for monthly
    //   time: '10:00'
    // }
  }
}, {
  tableName: 'campaigns',
  timestamps: true
});

module.exports = Campaign;