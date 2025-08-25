const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true // null for broadcast messages
  },
  channel: {
    type: DataTypes.ENUM('sms', 'email', 'line', 'instagram'),
    allowNull: false
  },
  channelUserId: {
    type: DataTypes.STRING,
    allowNull: false // LINE user ID, Instagram user ID, or email address
  },
  direction: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: false
  },
  messageType: {
    type: DataTypes.ENUM('text', 'image', 'video', 'file', 'sticker'),
    defaultValue: 'text'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
    defaultValue: 'pending'
  },
  externalMessageId: {
    type: DataTypes.STRING,
    allowNull: true // External platform message ID
  },
  threadId: {
    type: DataTypes.STRING,
    allowNull: true // For conversation threading
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'message_conversations',
      key: 'id'
    }
  },
  bulkJobId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'bulk_message_jobs',
      key: 'id'
    }
  },
  // Email specific fields
  emailSubject: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Tracking data
  openedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clickedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bouncedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'messages',
  timestamps: true
});

module.exports = Message;