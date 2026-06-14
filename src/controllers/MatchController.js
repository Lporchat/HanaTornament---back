const { Match, Round, Tournament, Organization, User } = require('../models');
const { updateRivalry, revertRivalry } = require('./RivalryController');
const sequelize = require('../config/database');

const reportResult = async (req, res) => {
  try {
    const { winnerId, isDraw } = req.body;

    const match = await Match.findByPk(req.params.matchId, {
      include: [{
        model: Round, as: 'round',
        include: [{
          model: Tournament, as: 'tournament',
          include: [{ model: Organization, as: 'organization' }],
        }],
      }],
    });

    if (!match) return res.status(404).json({ message: 'Partida não encontrada.' });
    if (match.isBye) return res.status(400).json({ message: 'Partidas bye não precisam de resultado.' });
    if (match.round.status === 'finished') {
      return res.status(400).json({ message: 'A rodada já foi finalizada, não é possível editar o resultado.' });
    }

    const { organization } = match.round.tournament;
    if (organization.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Sem permissão.' });
    }

    if (!isDraw && winnerId !== match.player1Id && winnerId !== match.player2Id) {
      return res.status(400).json({ message: 'O vencedor deve ser um dos jogadores da partida.' });
    }

    const wasFinished = match.status === 'finished';

    const t = await sequelize.transaction();
    try {
      if (wasFinished) {
        if (match.isDraw) {
          await revertRivalry(null, null, t, match.player1Id, match.player2Id);
        } else {
          const prevLoserId = match.winnerId === match.player1Id ? match.player2Id : match.player1Id;
          await revertRivalry(match.winnerId, prevLoserId, t);
        }
      }

      if (isDraw) {
        await match.update({ isDraw: true, winnerId: null, status: 'finished' }, { transaction: t });
        await updateRivalry(null, null, t, match.player1Id, match.player2Id);
      } else {
        const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
        await match.update({ winnerId, isDraw: false, status: 'finished' }, { transaction: t });
        await updateRivalry(winnerId, loserId, t);
      }
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    return res.json({ match });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

const getMatchById = async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.matchId, {
      include: [
        { model: User, as: 'player1', attributes: ['id', 'fullName'] },
        { model: User, as: 'player2', attributes: ['id', 'fullName'] },
        { model: User, as: 'winner', attributes: ['id', 'fullName'] },
        { model: Round, as: 'round', attributes: ['id', 'roundNumber', 'status'] },
      ],
    });

    if (!match) return res.status(404).json({ message: 'Partida não encontrada.' });

    return res.json({ match });
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

module.exports = { reportResult, getMatchById };
