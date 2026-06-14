const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditTransaction = sequelize.define('CreditTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  walletId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('earned', 'spent', 'adjusted'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // id do torneio, venda, etc.
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'credit_transactions',
});

module.exports = CreditTransaction;
