const { fetchFinageData } = require('./fetchers/finageFetcher');
const { fetchKiteData } = require('./fetchers/kiteFetcher');
const { fetchAlphaVantageData } = require('./fetchers/alphavantageFetcher');
const { fetchFinsignalsData } = require('./fetchers/finsignalsFetcher');

async function checkSourceHealth() {
  const sources = [
    { name: 'finage', fetchFn: fetchFinageData },
    { name: 'kite', fetchFn: fetchKiteData },
    { name: 'alphavantage', fetchFn: fetchAlphaVantageData },
    { name: 'finsignals', fetchFn: fetchFinsignalsData }
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
