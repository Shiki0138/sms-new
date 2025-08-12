const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MedicalRecord = sequelize.define('MedicalRecord', {
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
  appointmentId: {
    type: DataTypes.UUID,
    references: {
      model: 'appointments',
      key: 'id'
    }
  },
  visitDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  services: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  treatmentDetails: {
    type: DataTypes.TEXT
  },
  productsUsed: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  hairCondition: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  scalpCondition: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  allergies: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  concerns: {
    type: DataTypes.TEXT
  },
  recommendations: {
    type: DataTypes.TEXT
  },
  beforePhotoUrl: {
    type: DataTypes.STRING
  },
  afterPhotoUrl: {
    type: DataTypes.STRING
  },
  photos: {
    type: DataTypes.ARRAY(DataTypes.JSON),
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'medical_records',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['customerId']
    },
    {
      fields: ['visitDate']
    }
  ]
});

module.exports = MedicalRecord;