const axios = require('axios');
const logger = require('../../utils/logger');
const cache = require('../../config/redis');
const { alphaVantageLimiter } = require('../../utils/apiRateLimiter');

async function fetchAlphaVantageData() {
  if (!alphaVantageLimiter.canFetch()) {
    logger.warn('Alpha Vantage rate limit reached. Recovering real-time data from Redis cache...');
    const cached = await cache.get('last_valid_alphavantage');
    if (cached) return cached;
    throw new Error('Alpha Vantage rate limit reached and no cached real-time data available');
  }

  logger.info('Fetching real-time market data from Alpha Vantage API...');
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey || apiKey === 'demo') {
    logger.warn('ALPHA_VANTAGE_API_KEY missing or set to demo');
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=MSFT&apikey=${apiKey || 'demo'}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data['Information'] || response.data['Note'] || response.data['Error Message']) {
      const msg = response.data['Information'] || response.data['Note'] || response.data['Error Message'];
      throw new Error(`Alpha Vantage API message: ${msg}`);
    }

    const quote = response.data['Global Quote'] || {};
    const price = parseFloat(quote['05. price']);

    if (isNaN(price)) {
      throw new Error(`Invalid price payload from Alpha Vantage: ${JSON.stringify(response.data)}`);
    }

    const realTimeData = [{
      id: `alphavantage_${quote['01. symbol'] || 'MSFT'}`,
      title: `${quote['01. symbol'] || 'MSFT'} Real-Time Quote`,
      url: 'https://www.alphavantage.co',
      source: 'alphavantage',
      score: Math.round(price),
      fetched_at: new Date().toISOString(),
      metadata: {
        symbol: quote['01. symbol'],
        price: price,
        open: parseFloat(quote['02. open']) || null,
        high: parseFloat(quote['03. high']) || null,
        low: parseFloat(quote['04. low']) || null,
        change: quote['09. change'],
        changePercent: quote['10. change percent'],
        volume: parseInt(quote['06. volume'] || '0', 10)
      }
    }];

    await cache.set('last_valid_alphavantage', realTimeData, 86400);
    return realTimeData;
  } catch (err) {
    logger.warn('Alpha Vantage real-time fetch failed:', err.message);
    const cached = await cache.get('last_valid_alphavantage');
    if (cached) return cached;
    throw err;
  }
}

module.exports = { fetchAlphaVantageData };
