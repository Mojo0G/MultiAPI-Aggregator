const { fetchTwelveData } = require('./fetchers/twelveDataFetcher');
const { fetchKiteData } = require('./fetchers/kiteFetcher');
const { fetchAlphaVantageData } = require('./fetchers/alphavantageFetcher');
const { fetchTiingoData } = require('./fetchers/tiingoFetcher');

async function checkSourceHealth() {
  const sources = [
    { name: 'twelvedata', fetchFn: fetchTwelveData },
    { name: 'kite', fetchFn: fetchKiteData },
    { name: 'alphavantage', fetchFn: fetchAlphaVantageData },
    { name: 'tiingo', fetchFn: fetchTiingoData }
  ];

  const results = [];

  for (const s of sources) {
    const startTime = Date.now();
    try {
      await s.fetchFn();
      const latencyMs = Date.now() - startTime;
      results.push({
        source: s.name,
        status: 'healthy',
        latency_ms: latencyMs,
        checked_at: new Date().toISOString()
      });
    } catch (err) {
      results.push({
        source: s.name,
        status: 'degraded',
        error: err.message,
        checked_at: new Date().toISOString()
      });
    }
  }

  return results;
}

module.exports = { checkSourceHealth };
