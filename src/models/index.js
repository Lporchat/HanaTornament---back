const sequelize = require('../config/database');

const User = require('./User');
const Organization = require('./Organization');
const Tournament = require('./Tournament');
const TournamentEnrollment = require('./TournamentEnrollment');
const Round = require('./Round');
const Match = require('./Match');
const PrizeDistribution = require('./PrizeDistribution');
const CreditWallet = require('./CreditWallet');
const CreditTransaction = require('./CreditTransaction');
const PlayerRivalry = require('./PlayerRivalry');

// Organization
User.hasMany(Organization, { foreignKey: 'ownerId' });
Organization.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// Tournament
Organization.hasMany(Tournament, { foreignKey: 'organizationId', as: 'tournaments' });
Tournament.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

// Enrollments
Tournament.hasMany(TournamentEnrollment, { foreignKey: 'tournamentId', as: 'enrollments' });
TournamentEnrollment.belongsTo(Tournament, { foreignKey: 'tournamentId', as: 'tournament' });
User.hasMany(TournamentEnrollment, { foreignKey: 'userId', as: 'enrollments' });
TournamentEnrollment.belongsTo(User, { foreignKey: 'userId', as: 'player' });

// Rounds
Tournament.hasMany(Round, { foreignKey: 'tournamentId', as: 'rounds' });
Round.belongsTo(Tournament, { foreignKey: 'tournamentId', as: 'tournament' });

// Matches
Round.hasMany(Match, { foreignKey: 'roundId', as: 'matches' });
Match.belongsTo(Round, { foreignKey: 'roundId', as: 'round' });
Match.belongsTo(User, { foreignKey: 'player1Id', as: 'player1' });
Match.belongsTo(User, { foreignKey: 'player2Id', as: 'player2' });
Match.belongsTo(User, { foreignKey: 'winnerId', as: 'winner' });

// Prize distribution
Tournament.hasMany(PrizeDistribution, { foreignKey: 'tournamentId', as: 'prizeDistribution' });
PrizeDistribution.belongsTo(Tournament, { foreignKey: 'tournamentId' });

// Wallet
User.hasOne(CreditWallet, { foreignKey: 'userId', as: 'wallet' });
CreditWallet.belongsTo(User, { foreignKey: 'userId' });

// Transactions
CreditWallet.hasMany(CreditTransaction, { foreignKey: 'walletId', as: 'transactions' });
CreditTransaction.belongsTo(CreditWallet, { foreignKey: 'walletId' });

// Rivalries
User.hasMany(PlayerRivalry, { foreignKey: 'player1Id', as: 'rivalriesAsPlayer1' });
User.hasMany(PlayerRivalry, { foreignKey: 'player2Id', as: 'rivalriesAsPlayer2' });
PlayerRivalry.belongsTo(User, { foreignKey: 'player1Id', as: 'player1' });
PlayerRivalry.belongsTo(User, { foreignKey: 'player2Id', as: 'player2' });

module.exports = {
  sequelize,
  User,
  Organization,
  Tournament,
  TournamentEnrollment,
  Round,
  Match,
  PrizeDistribution,
  CreditWallet,
  CreditTransaction,
  PlayerRivalry,
};
