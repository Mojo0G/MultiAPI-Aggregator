const axios = require('axios');
const logger = require('../../utils/logger');
const cache = require('../../config/redis');
const { fmpLimiter } = require('../../utils/apiRateLimiter');

async function fetchFmpData() {
  if (!fmpLimiter.canFetch()) {
    logger.warn('FMP rate limit reached. Recovering real-time data from Redis cache...');
    const cached = await cache.get('last_valid_fmp');
    if (cached) return cached;
    throw new Error('FMP rate limit reached and no cached real-time data available');
  }

  logger.info('Fetching real-time market data from Financial Modeling Prep (FMP) API...');
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey || apiKey === 'demo') {
    logger.warn('FMP_API_KEY missing or set to demo');
  }

  const url = `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey || 'demo'}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const item = Array.isArray(response.data) ? response.data[0] : response.data;

    if (!item || response.data['Error Message']) {
      throw new Error(`FMP API error: ${response.data['Error Message'] || 'Empty payload'}`);
    }

    const price = parseFloat(item.price || item.previousClose);
    if (isNaN(price)) {
      throw new Error(`Invalid price payload from FMP: ${JSON.stringify(item)}`);
    }

    const realTimeData = [{
      id: `fmp_${item.symbol || 'AAPL'}`,
      title: `${item.name || item.symbol} Real-Time Quote`,
      url: 'https://financialmodelingprep.com',
      source: 'fmp',
      score: Math.round(price),
      fetched_at: new Date().toISOString(),
      metadata: {
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        price: price,
        changesPercentage: item.changesPercentage,
        change: item.change,
        dayLow: item.dayLow,
        dayHigh: item.dayHigh,
        volume: item.volume
      }
    }];

    await cache.set('last_valid_fmp', realTimeData, 86400);
    return realTimeData;
  } catch (err) {
    logger.warn('FMP real-time fetch failed:', err.message);
    const cached = await cache.get('last_valid_fmp');
    if (cached) return cached;
    throw err;
  }
}

module.exports = { fetchFmpData };
