const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sale = sequelize.define('Sale', {
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
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  appointmentId: {
    type: DataTypes.UUID,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  saleDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  items: {
    type: DataTypes.ARRAY(DataTypes.JSON),
    defaultValue: []
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'credit_card', 'debit_card', 'electronic_money', 'bank_transfer', 'other'),
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('paid', 'pending', 'partial', 'refunded'),
    defaultValue: 'paid'
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'sales',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['customerId']
    },
    {
      fields: ['saleDate']
    },
    {
      fields: ['paymentStatus']
    }
  ]
});

module.exports = Sale;