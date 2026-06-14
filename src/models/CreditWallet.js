const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditWallet = sequelize.define('CreditWallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'credit_wallets',
});

module.exports = CreditWallet;
