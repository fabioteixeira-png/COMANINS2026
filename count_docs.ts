import { db } from './src/db/index.js';
import { documents } from './src/db/schema.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const all = await db.select({
    collectionName: documents.collectionName,
    count: sql<number>`count(*)`
  }).from(documents).groupBy(documents.collectionName);
  
  console.log(all);
}
run();
