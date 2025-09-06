const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChannelConfig = sequelize.define('ChannelConfig', {
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
  channel: {
    type: DataTypes.ENUM('sms', 'email', 'line', 'instagram'),
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false // twilio, sendgrid, line-api, instagram-api
  },
  config: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
    // SMS: { accountSid, authToken, phoneNumber, messagingServiceSid }
    // Email: { apiKey, fromEmail, fromName, domain }
    // LINE: { channelAccessToken, channelSecret, channelId }
    // Instagram: { accessToken, businessAccountId, webhookSecret }
  },
  encryptedConfig: {
    type: DataTypes.TEXT,
    allowNull: true // For storing encrypted sensitive data
  },
  webhookUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  webhookSecret: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastTestAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  connectionStatus: {
    type: DataTypes.ENUM('connected', 'disconnected', 'error', 'testing'),
    defaultValue: 'disconnected'
  },
  lastConnectionTest: {
    type: DataTypes.DATE,
    allowNull: true
  },
  connectionError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  testAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  maxTestAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 5
  }
}, {
  tableName: 'channel_configs',
  indexes: [
    {
      fields: ['userId', 'channel'],
      unique: true
    },
    {
      fields: ['userId', 'isActive']
    },
    {
      fields: ['connectionStatus']
    }
  ],
  hooks: {
    beforeValidate: (instance) => {
      // Ensure webhook URL is generated if not provided
      if (!instance.webhookUrl && instance.userId && instance.channel) {
        const baseUrl = process.env.BASE_URL || 'https://your-domain.com';
        instance.webhookUrl = `${baseUrl}/api/messaging/webhook/${instance.channel}`;
      }
    }
  }
});

module.exports = ChannelConfig;