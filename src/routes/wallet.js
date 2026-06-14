const { Router } = require('express');
const { getMyWallet, getMyTransactions, spend, adjust, getPlayerWallet } = require('../controllers/WalletController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);

// Jogador
router.get('/me', getMyWallet);
router.get('/me/transactions', getMyTransactions);

// Organizador
router.get('/player/:userId', getPlayerWallet);
router.post('/spend', spend);
router.post('/adjust', adjust);

module.exports = router;
