const axios = require('axios');
const logger = require('../../utils/logger');
const cache = require('../../config/redis');
const { tiingoLimiter } = require('../../utils/apiRateLimiter');

async function fetchTiingoData() {
  if (!tiingoLimiter.canFetch()) {
    logger.warn('Tiingo rate limit reached. Recovering real-time data from Redis cache...');
    const cached = await cache.get('last_valid_tiingo');
    if (cached) return cached;
    throw new Error('Tiingo rate limit reached and no cached real-time data available');
  }

  logger.info('Fetching real-time market data from Tiingo API...');
  const token = process.env.TIINGO_API_KEY;
  if (!token || token === 'demo') {
    logger.warn('TIINGO_API_KEY missing or set to demo');
  }

  const url = `https://api.tiingo.com/tiingo/daily/aapl/prices?token=${token || 'demo'}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const item = Array.isArray(response.data) ? response.data[0] : response.data;

    if (!item || response.data.detail) {
      throw new Error(`Tiingo API error: ${response.data.detail || 'Empty payload'}`);
    }

    const price = parseFloat(item.close || item.adjClose);
    if (isNaN(price)) {
      throw new Error(`Invalid price payload from Tiingo: ${JSON.stringify(item)}`);
    }

    const realTimeData = [{
      id: 'tiingo_AAPL',
      title: 'AAPL (Apple Inc) Real-Time Price',
      url: 'https://api.tiingo.com',
      source: 'tiingo',
      score: Math.round(price),
      fetched_at: new Date().toISOString(),
      metadata: {
        symbol: 'AAPL',
        close: price,
        open: item.open,
        high: item.high,
        low: item.low,
        volume: item.volume,
        date: item.date
      }
    }];

    await cache.set('last_valid_tiingo', realTimeData, 86400);
    return realTimeData;
  } catch (err) {
    logger.warn('Tiingo real-time fetch failed:', err.message);
    const cached = await cache.get('last_valid_tiingo');
    if (cached) return cached;
    throw err;
  }
}

module.exports = { fetchTiingoData };
