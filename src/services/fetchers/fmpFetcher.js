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

  logger.info('Fetching broad market companies from Financial Modeling Prep (FMP) API...');
  const apiKey = process.env.FMP_API_KEY || 'demo';
  // FMP Stock Screener returns active market companies across the entire stock market
  const url = `https://financialmodelingprep.com/api/v3/stock-screener?marketCapMoreThan=1000000000&limit=50&apikey=${apiKey}`;

  try {
    const response = await axios.get(url, { timeout: 8000 });
    const payload = Array.isArray(response.data) ? response.data : [];
    const items = [];

    for (const item of payload) {
      if (item && item.symbol && (item.price || item.marketCap)) {
        const price = parseFloat(item.price || 0);
        const percentChange = Math.abs(parseFloat(item.changesPercentage) || 0);
        const calculatedScore = Math.round(price + percentChange * 10);

        items.push({
          id: `fmp_${item.symbol}`,
          title: `${item.companyName || item.symbol} (${item.symbol}) - FMP Market Quote`,
          url: 'https://financialmodelingprep.com',
          source: 'fmp',
          score: calculatedScore,
          fetched_at: new Date().toISOString(),
          metadata: {
            symbol: item.symbol,
            name: item.companyName || item.symbol,
            exchange: item.exchangeShortName || item.exchange,
            price: price,
            changesPercentage: item.changesPercentage,
            marketCap: item.marketCap,
            volume: item.volume,
            sector: item.sector,
            industry: item.industry
          }
        });
      }
    }

    if (items.length > 0) {
      await cache.set('last_valid_fmp', items, 86400);
      return items;
    }

    throw new Error(`FMP API stock screener returned no valid company quotes`);
  } catch (err) {
    logger.warn('FMP real-time fetch failed:', err.message);
    const cached = await cache.get('last_valid_fmp');
    if (cached) return cached;
    throw err;
  }
}

module.exports = { fetchFmpData };
