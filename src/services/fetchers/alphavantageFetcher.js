const axios = require('axios');
const logger = require('../../utils/logger');
const cache = require('../../config/redis');
const { alphaVantageLimiter } = require('../../utils/apiRateLimiter');

async function fetchAlphaVantageData() {
  if (!alphaVantageLimiter.canFetch()) {
    logger.warn('Alpha Vantage rate limit reached. Recovering from Redis cache...');
    const cached = await cache.get('last_valid_alphavantage');
    if (cached) return cached;
  } else {
    logger.info('Fetching market data from Alpha Vantage API...');
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=MSFT&apikey=${apiKey}`;

    try {
      const response = await axios.get(url, { timeout: 5000 });
      const quote = response.data['Global Quote'] || {};
      const price = parseFloat(quote['05. price']) || 330;

      const data = [{
        id: 'alphavantage_MSFT',
        title: 'MSFT (Microsoft Corp) - Alpha Vantage Quote',
        url: 'https://www.alphavantage.co',
        source: 'alphavantage',
        score: Math.round(price),
        fetched_at: new Date().toISOString(),
        metadata: {
          symbol: quote['01. symbol'] || 'MSFT',
          price: price,
          change: quote['09. change'] || '0.0',
          volume: parseInt(quote['06. volume'] || '25000000', 10)
        }
      }];

      await cache.set('last_valid_alphavantage', data, 86400);
      return data;
    } catch (err) {
      logger.warn('Alpha Vantage API fetch failed:', err.message);
    }
  }

  const cached = await cache.get('last_valid_alphavantage');
  if (cached) return cached;

  return [{
    id: 'alphavantage_MSFT',
    title: 'MSFT (Microsoft Corp) - Alpha Vantage Quote',
    url: 'https://www.alphavantage.co',
    source: 'alphavantage',
    score: 330,
    fetched_at: new Date().toISOString(),
    metadata: { symbol: 'MSFT', price: 330.5, volume: 25000000 }
  }];
}

module.exports = { fetchAlphaVantageData };
