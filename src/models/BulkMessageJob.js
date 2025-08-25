const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BulkMessageJob = sequelize.define('BulkMessageJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  channels: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
    // ['sms', 'email', 'line', 'instagram']
  },
  recipientFilter: {
    type: DataTypes.JSON,
    defaultValue: {}
    // { tags: [], segments: [], customQuery: {} }
  },
  recipientCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  messageContent: {
    type: DataTypes.JSON,
    allowNull: false
    // { sms: { text }, email: { subject, html, text }, line: { text, image }, instagram: { text, mediaUrl } }
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled'),
    defaultValue: 'draft'
  },
  statistics: {
    type: DataTypes.JSON,
    defaultValue: {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
      clicked: 0
    }
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'bulk_message_jobs',
  indexes: [
    {
      fields: ['userId', 'status']
    },
    {
      fields: ['scheduledAt']
    }
  ]
});

module.exports = BulkMessageJob;