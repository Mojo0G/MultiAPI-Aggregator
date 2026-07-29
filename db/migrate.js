const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const pool = require('../src/config/db');
const logger = require('../src/utils/logger');

async function ensureDatabaseExists() {
  const dbName = process.env.DB_NAME || 'aggregator_db';
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      logger.info(`Database "${dbName}" does not exist. Creating database...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      logger.info(`Database "${dbName}" created successfully!`);
    }
  } catch (err) {
    logger.warn('Database existence check warning:', err.message);
  } finally {
    await client.end();
  }
}

async function runMigrations() {
  try {
    await ensureDatabaseExists();
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
