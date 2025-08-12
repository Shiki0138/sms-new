const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
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
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstNameKana: {
    type: DataTypes.STRING
  },
  lastNameKana: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  birthDate: {
    type: DataTypes.DATEONLY
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other')
  },
  postalCode: {
    type: DataTypes.STRING
  },
  prefecture: {
    type: DataTypes.STRING
  },
  city: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  },
  desires: {
    type: DataTypes.TEXT
  },
  needs: {
    type: DataTypes.TEXT
  },
  preferences: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  firstVisitDate: {
    type: DataTypes.DATEONLY
  },
  lastVisitDate: {
    type: DataTypes.DATEONLY
  },
  visitCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalSales: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  averageSpending: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  referralSource: {
    type: DataTypes.STRING
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'customers',
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['email']
    },
    {
      fields: ['phoneNumber']
    }
  ]
});

module.exports = Customer;