const { Router } = require('express');
const { createNextRound, getRounds, getRoundById, finishRound, getStandings, updateRoundSchedule } = require('../controllers/RoundController');
const { reportResult, getMatchById } = require('../controllers/MatchController');
const authMiddleware = require('../middlewares/auth');

const router = Router({ mergeParams: true });

// Standings (público)
router.get('/standings', getStandings);

// Rounds
router.get('/', getRounds);
router.get('/:roundId', getRoundById);
router.post('/', authMiddleware, createNextRound);
router.patch('/:roundId/finish', authMiddleware, finishRound);
router.patch('/:roundId/schedule', authMiddleware, updateRoundSchedule);

// Matches (aninhado na rodada)
router.get('/:roundId/matches/:matchId', getMatchById);
router.patch('/:roundId/matches/:matchId/result', authMiddleware, reportResult);

module.exports = router;
