const { Router } = require('express');
const { create, list, getById, update, remove } = require('../controllers/OrganizationController');
const authMiddleware = require('../middlewares/auth');

const router = Router();

router.use(authMiddleware);

router.post('/', create);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
