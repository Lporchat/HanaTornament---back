const { Router } = require('express');
const { getMyRivalries, getHeadToHead } = require('../controllers/RivalryController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);

router.get('/', getMyRivalries);
router.get('/h2h/:opponentId', getHeadToHead);

module.exports = router;
