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

const knownCollections = [
  'clients',
  'referenceStandards',
  'medical_exams',
  'payslips',
  'inventoryItems',
  'inventoryTransactions',
  'sitePhotos',
  'contactMessages',
  'savedIntakes',
  'portalUsers',
  'employeeBirthdays',
  'calibrationAuditLogs',
  'instruments',
  'calibrationReports',
  'trainings',
  'employeeTrainings',
  'rncReports',
  'financeTransactions',
  'financeContracts',
  'financeMeasurements',
  'internal_tickets',
  'accessAuditLogs',
  'auditLogs',
  'systemSettings',
  'messages'
];

async function migrateCollection(collectionName: string) {
  console.log(`Migrating collection: ${collectionName}...`);
  const snapshot = await getDocs(collection(fsDb, collectionName));
  
  if (snapshot.empty) {
    console.log(`Collection ${collectionName} is empty, skipping.`);
    return;
  }

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

  const chunkSize = 100;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    await pgDb.insert(schema.documents).values(chunk).onConflictDoNothing();
  }
  
  console.log(`Migrated ${batch.length} documents for ${collectionName}.`);
}

async function run() {
  try {
    for (const col of knownCollections) {
      await migrateCollection(col);
    }
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

run();
