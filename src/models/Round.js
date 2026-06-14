const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Round = sequelize.define('Round', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tournamentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  roundNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'finished'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  tableName: 'rounds',
});

module.exports = Round;
