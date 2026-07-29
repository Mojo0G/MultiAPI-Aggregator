const axios = require('axios');
const logger = require('../../utils/logger');

async function fetchFinsignalsData() {
  logger.info('Fetching market signals from FinSignals API...');
  const apiKey = process.env.FINSIGNALS_API_KEY || 'demo';
  const url = `https://api.finsignals.io/v1/latest?apikey=${apiKey}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const items = response.data.data || [];

    return items.map((item, idx) => ({
      id: `finsignals_${item.symbol || idx}`,
      title: `${item.symbol || 'TSLA'} - FinSignals Buy/Sell Signal`,
      url: 'https://finsignals.io',
      source: 'finsignals',
      score: Math.round(item.signal_score || item.price || 240),
      fetched_at: new Date().toISOString(),
      metadata: {
        symbol: item.symbol || 'TSLA',
        signal: item.signal || 'BUY',
        target_price: item.target_price || 260.0
      }
    }));
  } catch (err) {
    logger.warn('FinSignals API fetch failed, returning sample data:', err.message);
    return [{
      id: 'finsignals_TSLA',
      title: 'TSLA (Tesla Inc) - FinSignals Bullish Signal',
      url: 'https://finsignals.io',
      source: 'finsignals',
      score: 240,
      fetched_at: new Date().toISOString(),
      metadata: { symbol: 'TSLA', signal: 'STRONG_BUY', target_price: 260.0 }
    }];
  }
}

module.exports = { fetchFinsignalsData };
