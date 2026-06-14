const { PlayerRivalry, User } = require('../models');
const { Op } = require('sequelize');

const MIN_MATCHES = 3;

// Garante ordem canônica pra evitar duplicatas (menor UUID sempre é player1)
const canonicalOrder = (idA, idB) =>
  idA < idB ? { p1: idA, p2: idB } : { p1: idB, p2: idA };

const updateRivalry = async (winnerId, loserId, transaction = null, drawPlayer1Id = null, drawPlayer2Id = null) => {
  const isDraw = winnerId === null;
  const idA = isDraw ? drawPlayer1Id : winnerId;
  const idB = isDraw ? drawPlayer2Id : loserId;

  const { p1, p2 } = canonicalOrder(idA, idB);

  const [rivalry] = await PlayerRivalry.findOrCreate({
    where: { player1Id: p1, player2Id: p2 },
    defaults: { player1Id: p1, player2Id: p2, player1Wins: 0, player2Wins: 0, draws: 0, totalMatches: 0 },
    transaction,
  });

  if (isDraw) {
    await rivalry.increment({ draws: 1, totalMatches: 1 }, { transaction });
  } else {
    const isPlayer1Winner = winnerId === p1;
    await rivalry.increment(
      { [isPlayer1Winner ? 'player1Wins' : 'player2Wins']: 1, totalMatches: 1 },
      { transaction }
    );
  }
};

const revertRivalry = async (winnerId, loserId, transaction = null, drawPlayer1Id = null, drawPlayer2Id = null) => {
  const isDraw = winnerId === null;
  const idA = isDraw ? drawPlayer1Id : winnerId;
  const idB = isDraw ? drawPlayer2Id : loserId;

  const { p1, p2 } = canonicalOrder(idA, idB);

  const rivalry = await PlayerRivalry.findOne({ where: { player1Id: p1, player2Id: p2 }, transaction });
  if (!rivalry) return;

  if (isDraw) {
    await rivalry.decrement({ draws: 1, totalMatches: 1 }, { transaction });
  } else {
    const isPlayer1Winner = winnerId === p1;
    await rivalry.decrement(
      { [isPlayer1Winner ? 'player1Wins' : 'player2Wins']: 1, totalMatches: 1 },
      { transaction }
    );
  }
};

// Busca nemesis e bye do usuário autenticado
const getMyRivalries = async (req, res) => {
  try {
    const userId = req.userId;

    const rivalries = await PlayerRivalry.findAll({
      where: {
        [Op.or]: [{ player1Id: userId }, { player2Id: userId }],
        totalMatches: { [Op.gte]: MIN_MATCHES },
      },
      include: [
        { model: User, as: 'player1', attributes: ['id', 'fullName'] },
        { model: User, as: 'player2', attributes: ['id', 'fullName'] },
      ],
    });

    if (rivalries.length === 0) {
      return res.json({ nemesis: null, bye: null, rivalries: [] });
    }

    // Normaliza do ponto de vista do usuário
    const normalized = rivalries.map((r) => {
      const iAmPlayer1 = r.player1Id === userId;
      const opponent = iAmPlayer1 ? r.player2 : r.player1;
      const myWins = iAmPlayer1 ? r.player1Wins : r.player2Wins;
      const opponentWins = iAmPlayer1 ? r.player2Wins : r.player1Wins;

      return {
        opponent,
        myWins,
        opponentWins,
        totalMatches: r.totalMatches,
        myWinRate: parseFloat((myWins / r.totalMatches * 100).toFixed(1)),
        opponentWinRate: parseFloat((opponentWins / r.totalMatches * 100).toFixed(1)),
      };
    });

    const nemesis = normalized.reduce((best, curr) =>
      curr.opponentWinRate > best.opponentWinRate ? curr : best
    );

    const bye = normalized.reduce((best, curr) =>
      curr.myWinRate > best.myWinRate ? curr : best
    );

    return res.json({ nemesis, bye, rivalries: normalized });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Head-to-head entre dois jogadores específicos
const getHeadToHead = async (req, res) => {
  try {
    const { opponentId } = req.params;
    const userId = req.userId;

    const { p1, p2 } = canonicalOrder(userId, opponentId);

    const rivalry = await PlayerRivalry.findOne({
      where: { player1Id: p1, player2Id: p2 },
      include: [
        { model: User, as: 'player1', attributes: ['id', 'fullName'] },
        { model: User, as: 'player2', attributes: ['id', 'fullName'] },
      ],
    });

    if (!rivalry) {
      return res.json({ message: 'Nenhum confronto registrado entre esses jogadores.' });
    }

    const iAmPlayer1 = userId === p1;
    const opponent = iAmPlayer1 ? rivalry.player2 : rivalry.player1;
    const myWins = iAmPlayer1 ? rivalry.player1Wins : rivalry.player2Wins;
    const opponentWins = iAmPlayer1 ? rivalry.player2Wins : rivalry.player1Wins;

    return res.json({
      opponent,
      myWins,
      opponentWins,
      totalMatches: rivalry.totalMatches,
      myWinRate: parseFloat((myWins / rivalry.totalMatches * 100).toFixed(1)),
      opponentWinRate: parseFloat((opponentWins / rivalry.totalMatches * 100).toFixed(1)),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

module.exports = { updateRivalry, revertRivalry, getMyRivalries, getHeadToHead };
