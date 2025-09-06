const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  businessHours: {
    type: DataTypes.JSON,
    defaultValue: {
      monday: { open: '09:00', close: '19:00', isOpen: true },
      tuesday: { open: '09:00', close: '19:00', isOpen: true },
      wednesday: { open: '09:00', close: '19:00', isOpen: true },
      thursday: { open: '09:00', close: '19:00', isOpen: true },
      friday: { open: '09:00', close: '19:00', isOpen: true },
      saturday: { open: '09:00', close: '17:00', isOpen: true },
      sunday: { open: '09:00', close: '17:00', isOpen: false }
    }
  },
  holidays: {
    type: DataTypes.ARRAY(DataTypes.DATEONLY),
    defaultValue: []
  },
  temporaryClosures: {
    type: DataTypes.ARRAY(DataTypes.JSON),
    defaultValue: []
  },
  appointmentDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 60 // minutes
  },
  bufferTime: {
    type: DataTypes.INTEGER,
    defaultValue: 15 // minutes between appointments
  },
  services: {
    type: DataTypes.ARRAY(DataTypes.JSON),
    defaultValue: []
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 10.0
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'JPY'
  },
  reminderSettings: {
    type: DataTypes.JSON,
    defaultValue: {
      enabled: true,
      daysBefore: 1,
      time: '18:00'
    }
  },
  notificationSettings: {
    type: DataTypes.JSON,
    defaultValue: {
      email: true,
      sms: false,
      push: false
    }
  },
  theme: {
    type: DataTypes.STRING,
    defaultValue: 'light'
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'ja'
  }
}, {
  tableName: 'settings'
});

module.exports = Setting;