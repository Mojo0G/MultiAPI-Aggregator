// Simple logger utility for clear formatted logs with timestamps
const logger = {
  info: (message, extra = '') => {
    console.log(`[INFO] [${new Date().toISOString()}]: ${message}`, extra ? extra : '');
  },
  warn: (message, extra = '') => {
    console.warn(`[WARN] [${new Date().toISOString()}]: ${message}`, extra ? extra : '');
  },
  error: (message, extra = '') => {
    console.error(`[ERROR] [${new Date().toISOString()}]: ${message}`, extra ? extra : '');
  }
};

module.exports = logger;
