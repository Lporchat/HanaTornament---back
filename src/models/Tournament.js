const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tournament = sequelize.define('Tournament', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  game: {
    type: DataTypes.ENUM('pokemon', 'magic'),
    allowNull: false,
  },
  entryFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('draft', 'open', 'in_progress', 'finished'),
    allowNull: false,
    defaultValue: 'draft',
  },
  swissRounds: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  topCut: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'tournaments',
});

module.exports = Tournament;
