const { fetchTwelveData } = require('./fetchers/twelveDataFetcher');
const { fetchKiteData } = require('./fetchers/kiteFetcher');
const { fetchAlphaVantageData } = require('./fetchers/alphavantageFetcher');
const { fetchTiingoData } = require('./fetchers/tiingoFetcher');
const recordModel = require('../models/recordModel');
const cache = require('../config/redis');
const logger = require('../utils/logger');

const aggregatorService = {
  fetchAllAndStore: async () => {
    logger.info('Starting market data aggregation from Twelve Data, Kite, Alpha Vantage, and Tiingo...');

    const results = await Promise.allSettled([
      fetchTwelveData(),
      fetchKiteData(),
      fetchAlphaVantageData(),
      fetchTiingoData()
    ]);

    const allRecords = [];

    // Twelve Data
    if (results[0].status === 'fulfilled') {
      logger.info(`Twelve Data fetch successful: ${results[0].value.length} items`);
      allRecords.push(...results[0].value);
    } else {
      logger.warn('Twelve Data fetch failed:', results[0].reason?.message);
    }

    // Kite
    if (results[1].status === 'fulfilled') {
      logger.info(`Kite fetch successful: ${results[1].value.length} items`);
      allRecords.push(...results[1].value);
    } else {
      logger.warn('Kite fetch failed:', results[1].reason?.message);
    }

    // Alpha Vantage
    if (results[2].status === 'fulfilled') {
      logger.info(`Alpha Vantage fetch successful: ${results[2].value.length} items`);
      allRecords.push(...results[2].value);
    } else {
      logger.warn('Alpha Vantage fetch failed:', results[2].reason?.message);
    }

    // Tiingo
    if (results[3].status === 'fulfilled') {
      logger.info(`Tiingo fetch successful: ${results[3].value.length} items`);
      allRecords.push(...results[3].value);
    } else {
      logger.warn('Tiingo fetch failed:', results[3].reason?.message);
    }

    if (allRecords.length > 0) {
      await recordModel.saveManyRecords(allRecords);
      await cache.del('trending_all');
      await cache.del('trending_twelvedata');
      await cache.del('trending_kite');
      await cache.del('trending_alphavantage');
      await cache.del('trending_tiingo');
    }

    return { totalSaved: allRecords.length };
  },

  getTrendingItems: async (sourceFilter = null) => {
    const cacheKey = sourceFilter ? `trending_${sourceFilter.toLowerCase()}` : 'trending_all';

    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      logger.info(`Serving from Redis Cache [HIT]: ${cacheKey}`);
      return cachedData;
    }

    logger.info(`Cache [MISS]: ${cacheKey}. Querying PostgreSQL database...`);
    const records = await recordModel.getTrending(sourceFilter);

    const ttl = parseInt(process.env.CACHE_TTL || '300', 10);
    await cache.set(cacheKey, records, ttl);

    return records;
  }
};

module.exports = aggregatorService;
