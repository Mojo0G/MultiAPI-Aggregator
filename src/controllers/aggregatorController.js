const aggregatorService = require('../services/aggregatorService');
const { checkSourceHealth } = require('../services/healthService');
const logger = require('../utils/logger');

const getTrending = async (req, res, next) => {
  try {
    const source = req.query.source;
    logger.info(`GET /trending requested with source: ${source || 'all'}`);

    const data = await aggregatorService.getTrendingItems(source);

    res.status(200).json({
      status: 'success',
      count: data.length,
      filter: source || 'all',
      data
    });
  } catch (error) {
    next(error);
  }
};

const getSources = async (req, res, next) => {
  try {
    logger.info('GET /sources requested');

    const sources = await checkSourceHealth();

    res.status(200).json({
      status: 'success',
      sources
    });
  } catch (error) {
    next(error);
  }
};

const refreshData = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = process.env.REFRESH_TOKEN || 'secret123';

    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid or missing refresh token'
      });
    }

    logger.info('POST /refresh triggered');

    setImmediate(async () => {
      try {
        await aggregatorService.fetchAllAndStore();
        logger.info('Background refresh finished');
      } catch (err) {
        logger.error(`Background refresh failed: ${err.message}`);
      }
    });

    res.status(202).json({
      status: 'accepted',
      message: 'Background refresh triggered'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrending,
  getSources,
  refreshData
};
