const { Router } = require('express');
const { register, login, me } = require('../controllers/AuthController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, me);

module.exports = router;
