const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PrizeDistribution = sequelize.define('PrizeDistribution', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tournamentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  position: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
}, {
  tableName: 'prize_distributions',
  indexes: [
    { unique: true, fields: ['tournamentId', 'position'] },
  ],
});

module.exports = PrizeDistribution;
