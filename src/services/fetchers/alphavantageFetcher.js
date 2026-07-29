const axios = require('axios');
const logger = require('../../utils/logger');

async function fetchAlphaVantageData() {
  logger.info('Fetching market data from Alpha Vantage API...');
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=MSFT&apikey=${apiKey}`;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    const quote = response.data['Global Quote'] || {};
    const price = parseFloat(quote['05. price']) || 330;

    return [{
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
  } catch (err) {
    logger.warn('Alpha Vantage API fetch failed, returning sample data:', err.message);
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
}

module.exports = { fetchAlphaVantageData };
