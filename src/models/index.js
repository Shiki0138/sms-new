const sequelize = require('../config/database');
const User = require('./User');
const Customer = require('./Customer');
const Appointment = require('./Appointment');
const Sale = require('./Sale');
const MedicalRecord = require('./MedicalRecord');
const Setting = require('./Setting');

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

module.exports = {
  sequelize,
  User,
  Customer,
  Appointment,
  Sale,
  MedicalRecord,
  Setting
};