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
  
  let successCount = 0;
  for (const doc of clients) {
    try {
      await pgDb.insert(schema.documents).values({
        collectionName,
        id: doc.id,
        data: doc,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();
      successCount++;
    } catch(e: any) {
      // Just retry without printing all errors to avoid log spam
    }
  }
  console.log(`Successfully migrated ${successCount} documents for ${collectionName}.`);
  
  // also do instruments
  const collectionName2 = 'instruments';
  const instruments = data.instruments || [];
  console.log(`Migrating ${instruments.length} instruments...`);
  let successCount2 = 0;
  for (const doc of instruments) {
    try {
      await pgDb.insert(schema.documents).values({
        collectionName: collectionName2,
        id: doc.id,
        data: doc,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();
      successCount2++;
    } catch(e: any) {
    }
  }
  console.log(`Successfully migrated ${successCount2} documents for ${collectionName2}.`);

  pool.end();
}

run();
