require('dotenv').config();

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

function shouldUseSsl(url) {
  if (!url) return false;
  if (process.env.PGSSLMODE === 'disable') return false;
  return url.includes('sslmode=require') || url.includes('neon.tech') || process.env.NODE_ENV === 'production';
}

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client:', err.message);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  transaction,
};
