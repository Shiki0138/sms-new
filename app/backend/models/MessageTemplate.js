const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageTemplate = sequelize.define('MessageTemplate', {
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
  category: {
    type: DataTypes.ENUM('appointment', 'reminder', 'campaign', 'holiday', 'birthday', 'custom'),
    allowNull: false
  },
  channel: {
    type: DataTypes.ENUM('email', 'line', 'instagram', 'all'),
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true // For email
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  variables: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
    // Available variables: {{firstName}}, {{lastName}}, {{salonName}}, {{appointmentDate}}, {{appointmentTime}}, {{serviceName}}, etc.
  },
  mediaUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'message_templates',
  timestamps: true
});

module.exports = MessageTemplate;