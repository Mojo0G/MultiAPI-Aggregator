const logger = require('./logger');

class SourceRateLimiter {
  constructor(sourceName, maxPerMin = null, maxPerHour = null, maxPerDay = null) {
    this.sourceName = sourceName;
    this.maxPerMin = maxPerMin;
    this.maxPerHour = maxPerHour;
    this.maxPerDay = maxPerDay;

    this.minCount = 0;
    this.minReset = Date.now() + 60 * 1000;

    this.hourCount = 0;
    this.hourReset = Date.now() + 60 * 60 * 1000;

    this.dayCount = 0;
    this.dayReset = Date.now() + 24 * 60 * 60 * 1000;
  }

  canFetch() {
    const now = Date.now();

    if (now > this.minReset) {
      this.minCount = 0;
      this.minReset = now + 60 * 1000;
    }

    if (now > this.hourReset) {
      this.hourCount = 0;
      this.hourReset = now + 60 * 60 * 1000;
    }

    if (now > this.dayReset) {
      this.dayCount = 0;
      this.dayReset = now + 24 * 60 * 60 * 1000;
    }

    if (this.maxPerMin && this.minCount >= this.maxPerMin) {
      logger.warn(`Upstream rate limit reached for ${this.sourceName} (${this.maxPerMin} req/min). Skipping request.`);
      return false;
    }

    if (this.maxPerHour && this.hourCount >= this.maxPerHour) {
      logger.warn(`Upstream rate limit reached for ${this.sourceName} (${this.maxPerHour} req/hour). Skipping request.`);
      return false;
    }

    if (this.maxPerDay && this.dayCount >= this.maxPerDay) {
      logger.warn(`Upstream rate limit reached for ${this.sourceName} (${this.maxPerDay} req/day). Skipping request.`);
      return false;
    }

    this.minCount++;
    this.hourCount++;
    this.dayCount++;
    return true;
  }
}

// Configured Upstream API Rate Limiters (Free Tier Limits)
const alphaVantageLimiter = new SourceRateLimiter('alphavantage', 5, null, 25);   // 5/min, 25/day
const twelveDataLimiter = new SourceRateLimiter('twelvedata', null, null, 800);    // 800/day
const fmpLimiter = new SourceRateLimiter('fmp', null, null, 250);                 // 250/day
const tiingoLimiter = new SourceRateLimiter('tiingo', null, 50, 1000);             // 50/hour, 1000/day

module.exports = {
  alphaVantageLimiter,
  twelveDataLimiter,
  fmpLimiter,
  tiingoLimiter
};
