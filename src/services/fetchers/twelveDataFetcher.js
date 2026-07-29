const axios = require('axios');
const logger = require('../../utils/logger');

async function fetchTwelveData() {
  logger.info('Fetching market data from Twelve Data API...');
  const apiKey = process.env.TWELVE_DATA_API_KEY || 'demo';
  const url = `https://api.twelvedata.com/quote?symbol=AAPL&apikey=${apiKey}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const item = response.data;
    const price = parseFloat(item.close || item.previous_close || '190');

    return [{
      id: `twelvedata_${item.symbol || 'AAPL'}`,
      title: `${item.name || 'Apple Inc'} (${item.symbol || 'AAPL'}) - Twelve Data Quote`,
      url: 'https://twelvedata.com',
      source: 'twelvedata',
      score: Math.round(price),
      fetched_at: new Date().toISOString(),
      metadata: {
        symbol: item.symbol || 'AAPL',
        name: item.name || 'Apple Inc',
        exchange: item.exchange || 'NASDAQ',
        price: price,
        volume: parseInt(item.volume || '45000000', 10)
      }
    }];
  } catch (err) {
    logger.warn('Twelve Data API fetch failed, returning sample data:', err.message);
    return [{
      id: 'twelvedata_AAPL',
      title: 'Apple Inc (AAPL) - Twelve Data Quote',
      url: 'https://twelvedata.com',
      source: 'twelvedata',
      score: 190,
      fetched_at: new Date().toISOString(),
      metadata: { symbol: 'AAPL', name: 'Apple Inc', exchange: 'NASDAQ', price: 190.25, volume: 45000000 }
    }];
  }
}

module.exports = { fetchTwelveData };
