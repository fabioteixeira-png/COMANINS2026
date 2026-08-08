const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  database: process.env.SQL_DB_NAME,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
});

async function run() {
  const res = await pool.query('SELECT collection_name, COUNT(*) FROM documents GROUP BY collection_name');
  console.log(res.rows);
  pool.end();
}
run();
