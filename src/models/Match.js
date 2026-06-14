const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  roundId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  player1Id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  // null quando a partida é um bye
  player2Id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  winnerId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isDraw: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isBye: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'finished'),
    allowNull: false,
    defaultValue: 'pending',
  },
}, {
  tableName: 'matches',
});

module.exports = Match;
