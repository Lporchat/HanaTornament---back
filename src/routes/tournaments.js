const { Router } = require('express');
const {
  create, list, getById, update,
  openEnrollment, start, updatePrizes,
} = require('../controllers/TournamentController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

// Rotas públicas
router.get('/', list);
router.get('/:id', getById);

// Rotas protegidas (organizador)
router.post('/', authMiddleware, create);
router.put('/:id', authMiddleware, update);
router.patch('/:id/open', authMiddleware, openEnrollment);
router.patch('/:id/start', authMiddleware, start);
router.put('/:id/prizes', authMiddleware, updatePrizes);

module.exports = router;
