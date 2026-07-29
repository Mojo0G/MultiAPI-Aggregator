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

  logger.info('Fetching real-time multi-company market data from Tiingo API...');
  const token = process.env.TIINGO_API_KEY || 'demo';
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
  const items = [];

  for (const symbol of symbols) {
    const url = `https://api.tiingo.com/tiingo/daily/${symbol.toLowerCase()}/prices?token=${token}`;
    try {
      const response = await axios.get(url, { timeout: 5000 });
      const item = Array.isArray(response.data) ? response.data[0] : response.data;
      if (item && (item.close || item.adjClose)) {
        const price = parseFloat(item.close || item.adjClose);
        const calculatedScore = Math.round(price);

        items.push({
          id: `tiingo_${symbol}`,
          title: `${symbol} Real-Time Price - Tiingo`,
          url: 'https://api.tiingo.com',
          source: 'tiingo',
          score: calculatedScore,
          fetched_at: new Date().toISOString(),
          metadata: {
            symbol: symbol,
            close: price,
            high: item.high,
            low: item.low,
            volume: item.volume,
            date: item.date
          }
        });
      }
    } catch (err) {}
  }

  if (items.length > 0) {
    await cache.set('last_valid_tiingo', items, 86400);
    return items;
  }

  const cached = await cache.get('last_valid_tiingo');
  if (cached) return cached;

  throw new Error('Tiingo fetch returned no valid quotes');
}

module.exports = { fetchTiingoData };
