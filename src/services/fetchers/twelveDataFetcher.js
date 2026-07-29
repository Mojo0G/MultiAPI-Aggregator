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

  logger.info('Fetching broad market multi-company quotes from Twelve Data API...');
  const apiKey = process.env.TWELVE_DATA_API_KEY || 'demo';
  const symbols = 'AAPL,MSFT,GOOGL,AMZN,TSLA,NVDA,META,NFLX,AMD,INTC,IBM,ORCL,CSCO,DIS,NKE,BA,SPY,QQQ,BTC/USD,ETH/USD';
  const url = `https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${apiKey}`;

  try {
    const response = await axios.get(url, { timeout: 8000 });
    const payload = response.data;
    const items = [];

    const quotes = payload.symbol ? [payload] : Object.values(payload);

    for (const item of quotes) {
      if (item && item.symbol && (item.close || item.price || item.previous_close)) {
        const price = parseFloat(item.close || item.price || item.previous_close);
        const percentChange = Math.abs(parseFloat(item.percent_change) || 0);
        const calculatedScore = Math.round(price + percentChange * 10);

        items.push({
          id: `twelvedata_${item.symbol}`,
          title: `${item.name || item.symbol} (${item.symbol}) - Twelve Data Market Quote`,
          url: 'https://twelvedata.com',
          source: 'twelvedata',
          score: calculatedScore,
          fetched_at: new Date().toISOString(),
          metadata: {
            symbol: item.symbol,
            name: item.name,
            exchange: item.exchange,
            price: price,
            percentChange: item.percent_change,
            volume: parseInt(item.volume || '0', 10),
            currency: item.currency || 'USD'
          }
        });
      }
    }

    if (items.length > 0) {
      await cache.set('last_valid_twelvedata', items, 86400);
      return items;
    }

    throw new Error(`Twelve Data API returned no valid company quotes`);
  } catch (err) {
    logger.warn('Twelve Data real-time fetch failed:', err.message);
    const cached = await cache.get('last_valid_twelvedata');
    if (cached) return cached;
    throw err;
  }
}

module.exports = { fetchTwelveData };
