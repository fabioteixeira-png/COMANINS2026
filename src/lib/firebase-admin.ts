import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8')
);

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

const hasAdminKeys = projectId && clientEmail && privateKey;

const adminApp: App = getApps()[0] ?? (hasAdminKeys ? initializeApp({
  credential: cert({
    projectId: projectId!,
    clientEmail: clientEmail!,
    privateKey: privateKey!,
  }),
  projectId: projectId!,
}) : initializeApp({
  projectId: firebaseConfig.projectId,
}));

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(
  adminApp,
  firebaseConfig.firestoreDatabaseId || '(default)'
);
