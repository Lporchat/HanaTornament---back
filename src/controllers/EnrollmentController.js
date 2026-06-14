const { TournamentEnrollment, Tournament, Organization, User } = require('../models');

// Jogador se inscreve no torneio
const enroll = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.tournamentId);

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });
    if (tournament.status !== 'open') {
      return res.status(400).json({ message: 'Inscrições não estão abertas.' });
    }

    const existing = await TournamentEnrollment.findOne({
      where: { tournamentId: tournament.id, userId: req.userId },
    });
    if (existing) return res.status(409).json({ message: 'Você já está inscrito neste torneio.' });

    const enrollment = await TournamentEnrollment.create({
      tournamentId: tournament.id,
      userId: req.userId,
    });

    return res.status(201).json({ enrollment });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Jogador cancela a própria inscrição
const cancel = async (req, res) => {
  try {
    const enrollment = await TournamentEnrollment.findOne({
      where: { tournamentId: req.params.tournamentId, userId: req.userId },
      include: [{ model: Tournament, as: 'tournament' }],
    });

    if (!enrollment) return res.status(404).json({ message: 'Inscrição não encontrada.' });
    if (enrollment.tournament.status !== 'open') {
      return res.status(400).json({ message: 'Não é possível cancelar após o início das inscrições.' });
    }

    await enrollment.destroy();

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Organizador lista inscritos do torneio
const listByTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.tournamentId, {
      include: [{ model: Organization, as: 'organization' }],
    });

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });
    if (tournament.organization.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Sem permissão.' });
    }

    const enrollments = await TournamentEnrollment.findAll({
      where: { tournamentId: tournament.id },
      include: [{ model: User, as: 'player', attributes: ['id', 'fullName', 'email', 'cpf'] }],
      order: [['createdAt', 'ASC']],
    });

    const total = enrollments.length;
    const confirmed = enrollments.filter((e) => e.paymentValidated).length;
    const pending = total - confirmed;

    return res.json({ total, confirmed, pending, enrollments });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Organizador valida pagamento de um inscrito
const validatePayment = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.tournamentId, {
      include: [{ model: Organization, as: 'organization' }],
    });

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });
    if (tournament.organization.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Sem permissão.' });
    }
    if (tournament.status === 'finished') {
      return res.status(400).json({ message: 'Torneio já finalizado.' });
    }

    const enrollment = await TournamentEnrollment.findOne({
      where: { tournamentId: tournament.id, userId: req.params.userId },
    });

    if (!enrollment) return res.status(404).json({ message: 'Inscrição não encontrada.' });

    await enrollment.update({ paymentValidated: true });

    return res.json({ enrollment });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

// Organizador remove um inscrito
const removePlayer = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.tournamentId, {
      include: [{ model: Organization, as: 'organization' }],
    });

    if (!tournament) return res.status(404).json({ message: 'Torneio não encontrado.' });
    if (tournament.organization.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Sem permissão.' });
    }
    if (tournament.status === 'in_progress' || tournament.status === 'finished') {
      return res.status(400).json({ message: 'Não é possível remover jogadores após o início.' });
    }

    const enrollment = await TournamentEnrollment.findOne({
      where: { tournamentId: tournament.id, userId: req.params.userId },
    });

    if (!enrollment) return res.status(404).json({ message: 'Inscrição não encontrada.' });

    await enrollment.destroy();

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

module.exports = { enroll, cancel, listByTournament, validatePayment, removePlayer };
