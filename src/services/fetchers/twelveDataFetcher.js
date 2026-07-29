const axios = require('axios');
const logger = require('../../utils/logger');
const cache = require('../../config/redis');
const { twelveDataLimiter } = require('../../utils/apiRateLimiter');

async function fetchTwelveData() {
  if (!twelveDataLimiter.canFetch()) {
    logger.warn('Twelve Data rate limit reached. Recovering real-time data from Redis cache...');
    const cached = await cache.get('last_valid_twelvedata');
    if (cached) return cached;
    throw new Error('Twelve Data rate limit reached and no cached real-time data available');
  }

  logger.info('Fetching real-time market data from Twelve Data API...');
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey || apiKey === 'demo') {
    logger.warn('TWELVE_DATA_API_KEY missing or set to demo');
  }

  const url = `https://api.twelvedata.com/quote?symbol=AAPL&apikey=${apiKey || 'demo'}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const item = response.data;

    if (item.code || item.status === 'error') {
      throw new Error(`Twelve Data API error: ${item.message || JSON.stringify(item)}`);
    }

    const price = parseFloat(item.close || item.price || item.previous_close);
    if (isNaN(price)) {
      throw new Error(`Invalid price payload from Twelve Data: ${JSON.stringify(item)}`);
    }

    const realTimeData = [{
      id: `twelvedata_${item.symbol || 'AAPL'}`,
      title: `${item.name || item.symbol} Real-Time Quote`,
      url: 'https://twelvedata.com',
      source: 'twelvedata',
      score: Math.round(price),
      fetched_at: new Date().toISOString(),
      metadata: {
        symbol: item.symbol,
        name: item.name,
        exchange: item.exchange,
        price: price,
        open: parseFloat(item.open) || null,
        high: parseFloat(item.high) || null,
        low: parseFloat(item.low) || null,
        volume: parseInt(item.volume || '0', 10),
        currency: item.currency || 'USD'
      }
    }];

    await cache.set('last_valid_twelvedata', realTimeData, 86400);
    return realTimeData;
  } catch (err) {
    logger.warn('Twelve Data real-time fetch failed:', err.message);
    const cached = await cache.get('last_valid_twelvedata');
    if (cached) return cached;
    throw err;
  }
}

module.exports = { fetchTwelveData };
