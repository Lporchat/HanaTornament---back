const { Tournament, Organization, TournamentEnrollment, PrizeDistribution, User } = require('../models');
const { getSwissConfig, getDefaultPrizePercentages } = require('../utils/swissFormat');
const { generateRound } = require('./RoundController');

const create = async (req, res) => {
  try {
    const { organizationId, name, game, entryFee, startDate } = req.body;

    if (!name || !game) {
      return res.status(400).json({ message: 'Nome e jogo são obrigatórios.' });
    }

    const requester = await User.findByPk(req.userId);
    if (!requester || requester.role !== 'store') {
      return res.status(403).json({ message: 'Apenas contas de loja podem criar torneios.' });
    }

    let organization;
    if (organizationId) {
      organization = await Organization.findOne({
        where: { id: organizationId, ownerId: req.userId },
      });
      if (!organization) {
        return res.status(403).json({ message: 'Organização não encontrada ou sem permissão.' });
      }
    } else {
      // Usa (ou cria) a organização da loja
      organization = await Organization.findOne({ where: { ownerId: req.userId } });
      if (!organization) {
        organization = await Organization.create({
          name: `Torneios de ${requester.fullName}`,
          ownerId: req.userId,
        });
      }
    }

    const tournament = await Tournament.create({
      organizationId: organization.id, name, game,
      entryFee: entryFee || 0,
      startDate: startDate || null,
    });

    return res.status(201).json({ tournament });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const list = async (req, res) => {
  try {
    const { game, status } = req.query;
    const where = {};
    if (game) where.game = game;
    if (status) where.status = status;

    const tournaments = await Tournament.findAll({
      where,
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name'] }],
      order: [['startDate', 'ASC']],
    });

    return res.json({ tournaments });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id, {
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name', 'ownerId'] },
        { model: PrizeDistribution, as: 'prizeDistribution', order: [['position', 'ASC']] },
        {
          model: TournamentEnrollment, as: 'enrollments',
          include: [{ model: User, as: 'player', attributes: ['id', 'fullName'] }],
        },
      ],
    });

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });

    return res.json({ tournament });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id, {
      include: [{ model: Organization, as: 'organization' }],
    });

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });
    if (tournament.organization.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Sem permissão.' });
    }
    if (tournament.status !== 'draft') {
      return res.status(400).json({ message: 'Só é possível editar torneios em rascunho.' });
    }

    const { name, game, entryFee, startDate } = req.body;
    await tournament.update({ name, game, entryFee, startDate });

    return res.json({ tournament });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Abre inscrições
const openEnrollment = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id, {
      include: [{ model: Organization, as: 'organization' }],
    });

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });
    if (tournament.organization.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Sem permissão.' });
    }
    if (tournament.status !== 'draft') {
      return res.status(400).json({ message: 'Torneio não está em rascunho.' });
    }

    await tournament.update({ status: 'open' });

    return res.json({ tournament });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Inicia o torneio: calcula rodadas, top cut e cria premiação padrão
const start = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id, {
      include: [{ model: Organization, as: 'organization' }],
    });

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });
    if (tournament.organization.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Sem permissão.' });
    }
    if (tournament.status !== 'open') {
      return res.status(400).json({ message: 'Torneio não está com inscrições abertas.' });
    }

    const confirmedCount = await TournamentEnrollment.count({
      where: { tournamentId: tournament.id, paymentValidated: true },
    });

    if (confirmedCount < 4) {
      return res.status(400).json({ message: 'Mínimo de 4 jogadores confirmados para iniciar.' });
    }

    const config = getSwissConfig(confirmedCount);
    if (!config) {
      return res.status(400).json({ message: 'Número de jogadores fora do suportado (4–512).' });
    }

    const prizePercentages = getDefaultPrizePercentages(config.topCut);

    await tournament.update({
      status: 'in_progress',
      swissRounds: config.swissRounds,
      topCut: config.topCut,
    });

    if (prizePercentages.length > 0) {
      await PrizeDistribution.bulkCreate(
        prizePercentages.map((p) => ({ tournamentId: tournament.id, ...p }))
      );
    }

    const { round, matches } = await generateRound(tournament);

    return res.json({ tournament, swissRounds: config.swissRounds, topCut: config.topCut, round, matches });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Atualiza percentuais de premiação (antes ou durante o torneio)
const updatePrizes = async (req, res) => {
  try {
    const { prizes } = req.body;

    const tournament = await Tournament.findByPk(req.params.id, {
      include: [{ model: Organization, as: 'organization' }],
    });

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });
    if (tournament.organization.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Sem permissão.' });
    }
    if (tournament.status === 'finished') {
      return res.status(400).json({ message: 'Torneio já finalizado.' });
    }

    if (!Array.isArray(prizes) || prizes.length === 0) {
      return res.status(400).json({ message: 'Envie um array de { position, percentage }.' });
    }

    const total = prizes.reduce((sum, p) => sum + parseFloat(p.percentage), 0);
    if (Math.abs(total - 100) > 0.01) {
      return res.status(400).json({ message: `Os percentuais devem somar 100%. Soma atual: ${total}%` });
    }

    await PrizeDistribution.destroy({ where: { tournamentId: tournament.id } });
    await PrizeDistribution.bulkCreate(
      prizes.map((p) => ({ tournamentId: tournament.id, position: p.position, percentage: p.percentage }))
    );

    const updated = await PrizeDistribution.findAll({
      where: { tournamentId: tournament.id },
      order: [['position', 'ASC']],
    });

    return res.json({ prizeDistribution: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

module.exports = { create, list, getById, update, openEnrollment, start, updatePrizes };
