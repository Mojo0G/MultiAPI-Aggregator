const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../utils/logger');

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database pool');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL database pool error:', err.message);
});

module.exports = pool;
