const sequelize = require('../config/database');
const User = require('./User');
const Customer = require('./Customer');
const Appointment = require('./Appointment');
const Sale = require('./Sale');
const MedicalRecord = require('./MedicalRecord');
const Setting = require('./Setting');
const Message = require('./Message');
const MessageConversation = require('./MessageConversation');
const ChannelConfig = require('./ChannelConfig');
const BulkMessageJob = require('./BulkMessageJob');

// User associations
User.hasMany(Customer, { foreignKey: 'userId', as: 'customers' });
User.hasMany(Appointment, { foreignKey: 'userId', as: 'appointments' });
User.hasMany(Sale, { foreignKey: 'userId', as: 'sales' });
User.hasMany(MedicalRecord, { foreignKey: 'userId', as: 'medicalRecords' });
User.hasOne(Setting, { foreignKey: 'userId', as: 'setting' });

// Customer associations
Customer.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Customer.hasMany(Appointment, { foreignKey: 'customerId', as: 'appointments' });
Customer.hasMany(Sale, { foreignKey: 'customerId', as: 'sales' });
Customer.hasMany(MedicalRecord, { foreignKey: 'customerId', as: 'medicalRecords' });

// Appointment associations
Appointment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Appointment.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Appointment.hasOne(Sale, { foreignKey: 'appointmentId', as: 'sale' });
Appointment.hasOne(MedicalRecord, { foreignKey: 'appointmentId', as: 'medicalRecord' });

// Sale associations
Sale.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Sale.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Sale.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

// MedicalRecord associations
MedicalRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });
MedicalRecord.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
MedicalRecord.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

// Setting associations
Setting.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Message associations
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Message.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Message.belongsTo(MessageConversation, { foreignKey: 'conversationId', as: 'conversation' });
Message.belongsTo(BulkMessageJob, { foreignKey: 'bulkJobId', as: 'bulkJob' });

// MessageConversation associations
MessageConversation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
MessageConversation.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
MessageConversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });

// ChannelConfig associations
ChannelConfig.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// BulkMessageJob associations
BulkMessageJob.belongsTo(User, { foreignKey: 'userId', as: 'user' });
BulkMessageJob.hasMany(Message, { foreignKey: 'bulkJobId', as: 'messages' });

// Additional Customer associations for messaging
Customer.hasMany(Message, { foreignKey: 'customerId', as: 'messages' });
Customer.hasMany(MessageConversation, { foreignKey: 'customerId', as: 'conversations' });

// Additional User associations for messaging
User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });
User.hasMany(MessageConversation, { foreignKey: 'userId', as: 'conversations' });
User.hasMany(ChannelConfig, { foreignKey: 'userId', as: 'channelConfigs' });
User.hasMany(BulkMessageJob, { foreignKey: 'userId', as: 'bulkMessageJobs' });

module.exports = {
  sequelize,
  User,
  Customer,
  Appointment,
  Sale,
  MedicalRecord,
  Setting,
  Message,
  MessageConversation,
  ChannelConfig,
  BulkMessageJob
};