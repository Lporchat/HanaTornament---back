const { Op } = require('sequelize');
const {
  Tournament, Organization, Round, Match,
  TournamentEnrollment, User, PrizeDistribution,
  CreditWallet, CreditTransaction,
} = require('../models');
const { generatePairings, calcPoints } = require('../utils/swissPairing');
const sequelize = require('../config/database');

const isOrganizer = async (tournamentId, userId) => {
  const tournament = await Tournament.findByPk(tournamentId, {
    include: [{ model: Organization, as: 'organization' }],
  });
  if (!tournament) return { error: 'Torneio não encontrado.', status: 404 };
  if (tournament.organization.ownerId !== userId) return { error: 'Sem permissão.', status: 403 };
  return { tournament };
};

// Monta standings a partir das partidas existentes
const buildStandings = async (tournamentId) => {
  const enrollments = await TournamentEnrollment.findAll({
    where: { tournamentId, paymentValidated: true },
    include: [{ model: User, as: 'player', attributes: ['id', 'fullName'] }],
  });

  const matches = await Match.findAll({
    include: [{ model: Round, as: 'round', where: { tournamentId } }],
    where: { status: 'finished' },
  });

  const stats = {};
  for (const e of enrollments) {
    stats[e.userId] = {
      userId: e.userId,
      fullName: e.player.fullName,
      wins: 0,
      draws: 0,
      losses: 0,
      byes: 0,
      points: 0,
      previousOpponents: new Set(),
      byeReceived: false,
    };
  }

  for (const m of matches) {
    if (m.isBye) {
      if (stats[m.player1Id]) {
        stats[m.player1Id].wins++;
        stats[m.player1Id].byes++;
        stats[m.player1Id].byeReceived = true;
      }
      continue;
    }
    if (stats[m.player1Id]) stats[m.player1Id].previousOpponents.add(m.player2Id);
    if (stats[m.player2Id]) stats[m.player2Id].previousOpponents.add(m.player1Id);

    if (m.isDraw) {
      if (stats[m.player1Id]) stats[m.player1Id].draws++;
      if (stats[m.player2Id]) stats[m.player2Id].draws++;
      continue;
    }

    if (!m.winnerId) continue;

    const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
    if (stats[m.winnerId]) stats[m.winnerId].wins++;
    if (stats[loserId]) stats[loserId].losses++;
  }

  for (const s of Object.values(stats)) {
    s.points = calcPoints(s.wins, s.draws, s.losses);
  }

  // Match win % de cada jogador desconsiderando a rodada de bye, com piso de 33% (regra padrão Swiss)
  const MIN_WIN_PCT = 1 / 3;
  for (const s of Object.values(stats)) {
    const realWins = s.wins - s.byes;
    const roundsPlayed = realWins + s.draws + s.losses;
    const realPoints = calcPoints(realWins, s.draws, s.losses);
    s.matchWinPct = roundsPlayed > 0 ? Math.max(realPoints / (roundsPlayed * 3), MIN_WIN_PCT) : MIN_WIN_PCT;
  }

  // OMW% = média do match win % dos adversários enfrentados
  for (const s of Object.values(stats)) {
    const opponents = [...s.previousOpponents].filter((id) => stats[id]);
    s.omw = opponents.length > 0
      ? opponents.reduce((sum, id) => sum + stats[id].matchWinPct, 0) / opponents.length
      : 0;
  }

  return Object.values(stats).sort((a, b) => b.points - a.points || b.omw - a.omw || b.wins - a.wins || b.draws - a.draws);
};

// Gera a próxima rodada Swiss para o torneio. Retorna { round, matches }.
const generateRound = async (tournament, scheduledAt = null) => {
  const rounds = await Round.findAll({ where: { tournamentId: tournament.id } });

  if (rounds.length > 0) {
    const lastRound = rounds[rounds.length - 1];
    if (lastRound.status !== 'finished') {
      throw Object.assign(new Error('A rodada atual ainda não foi finalizada.'), { status: 400 });
    }
  }

  if (rounds.length >= tournament.swissRounds) {
    throw Object.assign(new Error('Todas as rodadas Swiss já foram criadas.'), { status: 400 });
  }

  const standings = await buildStandings(tournament.id);
  const { pairs, bye } = generatePairings(standings);

  const roundNumber = rounds.length + 1;

  const round = await Round.create({
    tournamentId: tournament.id,
    roundNumber,
    status: 'in_progress',
    scheduledAt: scheduledAt || null,
  });

  const matchData = pairs.map((p) => ({
    roundId: round.id,
    player1Id: p.p1,
    player2Id: p.p2,
    isBye: false,
    status: 'pending',
  }));

  if (bye) {
    matchData.push({
      roundId: round.id,
      player1Id: bye,
      player2Id: null,
      winnerId: bye,
      isBye: true,
      status: 'finished',
    });
  }

  const matches = await Match.bulkCreate(matchData);

  return { round, matches };
};

const createNextRound = async (req, res) => {
  try {
    const { scheduledAt } = req.body || {};
    const { tournament, error, status } = await isOrganizer(req.params.tournamentId, req.userId);
    if (error) return res.status(status).json({ message: error });

    if (tournament.status !== 'in_progress') {
      return res.status(400).json({ message: 'Torneio não está em andamento.' });
    }

    const { round, matches } = await generateRound(tournament, scheduledAt);

    return res.status(201).json({ round, matches });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const getRounds = async (req, res) => {
  try {
    const rounds = await Round.findAll({
      where: { tournamentId: req.params.tournamentId },
      include: [{
        model: Match, as: 'matches',
        include: [
          { model: User, as: 'player1', attributes: ['id', 'fullName'] },
          { model: User, as: 'player2', attributes: ['id', 'fullName'] },
          { model: User, as: 'winner', attributes: ['id', 'fullName'] },
        ],
      }],
      order: [['roundNumber', 'ASC']],
    });

    return res.json({ rounds });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const getRoundById = async (req, res) => {
  try {
    const round = await Round.findOne({
      where: { id: req.params.roundId, tournamentId: req.params.tournamentId },
      include: [{
        model: Match, as: 'matches',
        include: [
          { model: User, as: 'player1', attributes: ['id', 'fullName'] },
          { model: User, as: 'player2', attributes: ['id', 'fullName'] },
          { model: User, as: 'winner', attributes: ['id', 'fullName'] },
        ],
      }],
    });

    if (!round) return res.status(404).json({ message: 'Rodada não encontrada.' });

    return res.json({ round });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Organizador define/altera o horário de início de uma rodada
const updateRoundSchedule = async (req, res) => {
  try {
    const { scheduledAt } = req.body || {};
    const { tournament, error, status } = await isOrganizer(req.params.tournamentId, req.userId);
    if (error) return res.status(status).json({ message: error });

    const round = await Round.findOne({
      where: { id: req.params.roundId, tournamentId: tournament.id },
    });

    if (!round) return res.status(404).json({ message: 'Rodada não encontrada.' });

    await round.update({ scheduledAt: scheduledAt || null });

    return res.json({ round });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const finishRound = async (req, res) => {
  try {
    const { tournament, error, status } = await isOrganizer(req.params.tournamentId, req.userId);
    if (error) return res.status(status).json({ message: error });

    const round = await Round.findOne({
      where: { id: req.params.roundId, tournamentId: tournament.id },
      include: [{ model: Match, as: 'matches' }],
    });

    if (!round) return res.status(404).json({ message: 'Rodada não encontrada.' });
    if (round.status === 'finished') return res.status(400).json({ message: 'Rodada já finalizada.' });

    const pending = round.matches.filter((m) => !m.isBye && m.status !== 'finished');
    if (pending.length > 0) {
      return res.status(400).json({
        message: `Ainda há ${pending.length} partida(s) sem resultado.`,
      });
    }

    await round.update({ status: 'finished' });

    // Se foi a última rodada, finaliza o torneio e distribui créditos
    const totalRounds = await Round.count({ where: { tournamentId: tournament.id } });
    if (totalRounds >= tournament.swissRounds) {
      await finalizeTournament(tournament);
    }

    return res.json({ round });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const finalizeTournament = async (tournament) => {
  const standings = await buildStandings(tournament.id);
  const prizes = await PrizeDistribution.findAll({
    where: { tournamentId: tournament.id },
    order: [['position', 'ASC']],
  });

  const confirmedCount = await TournamentEnrollment.count({
    where: { tournamentId: tournament.id, paymentValidated: true },
  });
  const prizePool = parseFloat(tournament.entryFee) * confirmedCount;

  const t = await sequelize.transaction();
  try {
    for (let i = 0; i < standings.length; i++) {
      const position = i + 1;
      const player = standings[i];
      const prize = prizes.find((p) => p.position === position);

      const creditEarned = prize
        ? parseFloat(((prize.percentage / 100) * prizePool).toFixed(2))
        : 0;

      await TournamentEnrollment.update(
        { finalPosition: position, creditEarned },
        { where: { tournamentId: tournament.id, userId: player.userId }, transaction: t }
      );

      if (creditEarned > 0) {
        let wallet = await CreditWallet.findOne({ where: { userId: player.userId }, transaction: t });
        if (!wallet) {
          wallet = await CreditWallet.create({ userId: player.userId, balance: 0 }, { transaction: t });
        }

        await CreditWallet.increment('balance', {
          by: creditEarned,
          where: { id: wallet.id },
          transaction: t,
        });

        await CreditTransaction.create({
          walletId: wallet.id,
          type: 'earned',
          amount: creditEarned,
          description: `${position}º lugar — ${tournament.name}`,
          referenceId: tournament.id,
        }, { transaction: t });
      }
    }

    await tournament.update({ status: 'finished' }, { transaction: t });
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

const getStandings = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });

    const standings = await buildStandings(tournament.id);

    return res.json({
      standings: standings.map((s, i) => ({
        position: i + 1,
        userId: s.userId,
        fullName: s.fullName,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        byes: s.byes,
        points: s.points,
        omw: parseFloat((s.omw * 100).toFixed(1)),
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

module.exports = { createNextRound, getRounds, getRoundById, finishRound, getStandings, updateRoundSchedule, generateRound };
