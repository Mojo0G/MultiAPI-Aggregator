const express = require('express');
const { getTrending, getSources, refreshData } = require('../controllers/aggregatorController');
const { trendingLimiter, sourcesLimiter, refreshLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.get('/trending', trendingLimiter, getTrending);
router.get('/sources', sourcesLimiter, getSources);
router.post('/refresh', refreshLimiter, refreshData);

module.exports = router;
