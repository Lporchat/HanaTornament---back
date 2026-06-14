const { Router } = require('express');
const {
  enroll, cancel, listByTournament, validatePayment, removePlayer,
} = require('../controllers/EnrollmentController');
const authMiddleware = require('../middlewares/auth');

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// Jogador
router.post('/', enroll);
router.delete('/', cancel);

// Organizador
router.get('/', listByTournament);
router.patch('/:userId/validate', validatePayment);
router.delete('/:userId', removePlayer);

module.exports = router;
