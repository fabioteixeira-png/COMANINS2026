import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './src/db/schema.js';
import firebaseConfig from './firebase-applet-config.json' with { type: "json" };
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

const app = initializeApp(firebaseConfig);
const fsDb = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function run() {
  const collectionName = 'clients';
  console.log(`Migrating collection: ${collectionName}...`);
  const snapshot = await getDocs(collection(fsDb, collectionName));
  
  const batch = [];
  for (const doc of snapshot.docs) {
    batch.push({
      collectionName,
      id: doc.id,
      data: doc.data(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  const chunkSize = 10; // reduce chunk size
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
