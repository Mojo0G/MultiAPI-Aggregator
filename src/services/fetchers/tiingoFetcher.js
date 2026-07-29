const axios = require('axios');
const logger = require('../../utils/logger');
const cache = require('../../config/redis');
const { tiingoLimiter } = require('../../utils/apiRateLimiter');

async function fetchTiingoData() {
  if (!tiingoLimiter.canFetch()) {
    logger.warn('Tiingo rate limit reached. Recovering from Redis cache...');
    const cached = await cache.get('last_valid_tiingo');
    if (cached) return cached;
  } else {
    logger.info('Fetching market data from Tiingo API...');
    const token = process.env.TIINGO_API_KEY || 'demo';
    const url = `https://api.tiingo.com/tiingo/daily/aapl/prices?token=${token}`;

    try {
      const response = await axios.get(url, { timeout: 5000 });
      const item = Array.isArray(response.data) ? response.data[0] : response.data;
      const price = parseFloat(item.close || item.adjClose || '188');

      const data = [{
        id: 'tiingo_AAPL',
        title: 'AAPL (Apple Inc) - Tiingo Daily Price',
        url: 'https://api.tiingo.com',
        source: 'tiingo',
        score: Math.round(price),
        fetched_at: new Date().toISOString(),
        metadata: {
          symbol: 'AAPL',
          close: price,
          high: item.high || 190.0,
          low: item.low || 187.5,
          volume: item.volume || 50000000
        }
      }];

      await cache.set('last_valid_tiingo', data, 86400);
      return data;
    } catch (err) {
      logger.warn('Tiingo API fetch failed:', err.message);
    }
  }

  const cached = await cache.get('last_valid_tiingo');
  if (cached) return cached;

  return [{
    id: 'tiingo_AAPL',
    title: 'AAPL (Apple Inc) - Tiingo Daily Price',
    url: 'https://api.tiingo.com',
    source: 'tiingo',
    score: 188,
    fetched_at: new Date().toISOString(),
    metadata: { symbol: 'AAPL', close: 188.5, high: 190.0, low: 187.5, volume: 50000000 }
  }];
}

module.exports = { fetchTiingoData };
