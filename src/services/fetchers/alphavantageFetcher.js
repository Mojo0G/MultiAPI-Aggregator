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

  logger.info('Fetching broad market top gainers/losers/most active companies from Alpha Vantage API...');
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
  // Returns top most active, top gainers, and top losers across the whole stock market
  const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`;

  try {
    const response = await axios.get(url, { timeout: 8000 });
    const payload = response.data;
    const items = [];

    const categories = ['most_actively_traded', 'top_gainers', 'top_losers'];

    for (const cat of categories) {
      const list = payload[cat] || [];
      for (const item of list) {
        if (item && item.ticker && item.price) {
          const price = parseFloat(item.price);
          const changePercent = Math.abs(parseFloat((item.change_percentage || '0').replace('%', '')) || 0);
          const calculatedScore = Math.round(price + changePercent * 10);

          items.push({
            id: `alphavantage_${item.ticker}`,
            title: `${item.ticker} - Alpha Vantage Market Quote (${cat.replace(/_/g, ' ')})`,
            url: 'https://www.alphavantage.co',
            source: 'alphavantage',
            score: calculatedScore,
            fetched_at: new Date().toISOString(),
            metadata: {
              symbol: item.ticker,
              price: price,
              changeAmount: item.change_amount,
              changePercent: item.change_percentage,
              volume: parseInt(item.volume || '0', 10),
              category: cat
            }
          });
        }
      }
    }

    if (items.length > 0) {
      await cache.set('last_valid_alphavantage', items, 86400);
      return items;
    }

    throw new Error(`Alpha Vantage API returned no valid company quotes: ${JSON.stringify(payload)}`);
  } catch (err) {
    logger.warn('Alpha Vantage real-time fetch failed:', err.message);
    const cached = await cache.get('last_valid_alphavantage');
    if (cached) return cached;
    throw err;
  }
}

module.exports = { fetchAlphaVantageData };
