const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TournamentEnrollment = sequelize.define('TournamentEnrollment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tournamentId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  paymentValidated: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  finalPosition: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  creditEarned: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
}, {
  tableName: 'tournament_enrollments',
  indexes: [
    { unique: true, fields: ['tournamentId', 'userId'] },
  ],
});

module.exports = TournamentEnrollment;
