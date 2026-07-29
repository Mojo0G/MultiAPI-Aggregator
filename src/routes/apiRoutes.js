const express = require('express');
const { getTrending, getSources, refreshData } = require('../controllers/aggregatorController');

const router = express.Router();

router.get('/trending', getTrending);
router.get('/sources', getSources);
router.post('/refresh', refreshData);

module.exports = router;
