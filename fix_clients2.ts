import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './src/db/schema.js';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  host: process.env.SQL_HOST,
  database: process.env.SQL_DB_NAME,
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
});
const pgDb = drizzle(pool, { schema });

import fs from 'fs';

async function run() {
  const collectionName = 'clients';
  const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  const clients = data.clients || [];

  console.log(`Migrating ${clients.length} clients...`);
  
  const batch = [];
  for (const doc of clients) {
    batch.push({
      collectionName,
      id: doc.id,
      data: doc,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  const chunkSize = 50;
  let successCount = 0;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    try {
      await pgDb.insert(schema.documents).values(chunk).onConflictDoNothing();
      successCount += chunk.length;
    } catch(e: any) {
      console.log('Error inserting chunk:', e.message);
    }
  }
  console.log(`Successfully migrated ${successCount} documents for ${collectionName}.`);
  pool.end();
}

run();
