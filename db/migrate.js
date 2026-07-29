const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');
const logger = require('../src/utils/logger');

async function runMigrations() {
  try {
    
    logger.info('Starting database migrations...');
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      logger.info(`Executing migration file: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
    }
    logger.info('All database migrations completed successfully!');
  } catch (err) {
    logger.error('Database migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

runMigrations();
