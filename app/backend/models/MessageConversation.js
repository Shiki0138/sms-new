const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageConversation = sequelize.define('MessageConversation', {
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
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  channel: {
    type: DataTypes.ENUM('sms', 'email', 'line', 'instagram', 'unified'),
    allowNull: false
  },
  channelIdentifier: {
    type: DataTypes.STRING,
    allowNull: false
    // Phone number for SMS, email address for email, LINE ID for LINE, Instagram username for Instagram
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastMessagePreview: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  unreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isArchived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
}, {
  tableName: 'message_conversations',
  indexes: [
    {
      fields: ['userId', 'customerId', 'channel']
    },
    {
      fields: ['lastMessageAt']
    }
  ]
});

module.exports = MessageConversation;