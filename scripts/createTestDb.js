require('dotenv').config();
const { Client } = require('pg');

const TEST_DB_NAME = 'defaultdb_test';

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { require: true, rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB_NAME]);
    if (exists.rowCount > 0) {
      console.log(`Banco "${TEST_DB_NAME}" já existe.`);
    } else {
      await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`Banco "${TEST_DB_NAME}" criado.`);
    }
  } catch (err) {
    console.error('Erro ao criar banco de teste:', err);
  } finally {
    await client.end();
  }
})();
