const { Router } = require('express');
const authRoutes = require('./auth');
const organizationRoutes = require('./organizations');
const tournamentRoutes = require('./tournaments');
const enrollmentRoutes = require('./enrollments');
const roundRoutes = require('./rounds');
const walletRoutes = require('./wallet');
const rivalryRoutes = require('./rivalries');

const router = Router();

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/tournaments/:tournamentId/enrollments', enrollmentRoutes);
router.use('/tournaments/:tournamentId/rounds', roundRoutes);
router.use('/wallet', walletRoutes);
router.use('/rivalries', rivalryRoutes);

module.exports = router;
