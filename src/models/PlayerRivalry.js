const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlayerRivalry = sequelize.define('PlayerRivalry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  player1Id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  player2Id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  player1Wins: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  player2Wins: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  draws: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  totalMatches: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'player_rivalries',
  indexes: [
    { unique: true, fields: ['player1Id', 'player2Id'] },
  ],
});

module.exports = PlayerRivalry;
