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
    }
  }
  console.log(`Successfully migrated ${successCount} documents for ${collectionName}.`);

  const collectionName2 = 'instruments';
  const instruments = data.instruments || [];
  console.log(`Migrating ${instruments.length} instruments...`);
  let successCount2 = 0;
  for (const doc of instruments) {
    try {
      const existing = await pgDb.select().from(schema.documents).where(and(eq(schema.documents.collectionName, collectionName2), eq(schema.documents.id, doc.id)));
      if (existing.length === 0) {
        await pgDb.insert(schema.documents).values({
          collectionName: collectionName2,
          id: doc.id,
          data: doc,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        successCount2++;
      }
    } catch(e: any) {
    }
  }
  console.log(`Successfully migrated ${successCount2} documents for ${collectionName2}.`);

  // rnc reports
  const collectionName3 = 'rncReports';
  const rncReports = data.rncReports || [];
  console.log(`Migrating ${rncReports.length} rncReports...`);
  let successCount3 = 0;
  for (const doc of rncReports) {
    try {
      const existing = await pgDb.select().from(schema.documents).where(and(eq(schema.documents.collectionName, collectionName3), eq(schema.documents.id, doc.id)));
      if (existing.length === 0) {
        await pgDb.insert(schema.documents).values({
          collectionName: collectionName3,
          id: doc.id,
          data: doc,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        successCount3++;
      }
    } catch(e: any) {
    }
  }
  console.log(`Successfully migrated ${successCount3} documents for ${collectionName3}.`);

  // system settings
  const collectionName4 = 'systemSettings';
  const systemSettings = data.systemSettings || [];
  console.log(`Migrating ${systemSettings.length} systemSettings...`);
  let successCount4 = 0;
  for (const doc of systemSettings) {
    try {
      const existing = await pgDb.select().from(schema.documents).where(and(eq(schema.documents.collectionName, collectionName4), eq(schema.documents.id, doc.id)));
      if (existing.length === 0) {
        await pgDb.insert(schema.documents).values({
          collectionName: collectionName4,
          id: doc.id,
          data: doc,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        successCount4++;
      }
    } catch(e: any) {
    }
  }
  console.log(`Successfully migrated ${successCount4} documents for ${collectionName4}.`);

  pool.end();
}

run();
