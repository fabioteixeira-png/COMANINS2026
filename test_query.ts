import { db } from './src/db/index.js';
import { documents } from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const all = await db.select().from(documents).where(and(eq(documents.collectionName, 'systemSettings'), eq(documents.id, 'portalUsersSeeded')));
    console.log(all);
  } catch (e: any) {
    console.log(e);
  }
}
run();
