import { db } from './src/db/index.js';
import { documents } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const all = await db.select().from(documents).where(eq(documents.collectionName, 'clients'));
  console.log(`Found ${all.length} clients`);
}
run();
