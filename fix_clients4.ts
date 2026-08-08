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
import { eq, and } from 'drizzle-orm';

async function run() {
  const collectionName = 'clients';
  const data = JSON.parse(fs.readFileSync('db.json', 'utf8'));
  const clients = data.clients || [];

  console.log(`Migrating ${clients.length} clients...`);
  
  let successCount = 0;
  for (const doc of clients) {
    try {
      const existing = await pgDb.select().from(schema.documents).where(and(eq(schema.documents.collectionName, collectionName), eq(schema.documents.id, doc.id)));
      if (existing.length === 0) {
        await pgDb.insert(schema.documents).values({
          collectionName,
          id: doc.id,
          data: doc,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        successCount++;
      }
    } catch(e: any) {
      console.log('Error inserting client:', e.message);
    }
  }
  console.log(`Successfully migrated ${successCount} documents for ${collectionName}.`);

  pool.end();
}

run();
