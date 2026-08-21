import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8')
  );
} catch (e) {
  console.warn("⚠️ Arquivo firebase-applet-config.json não encontrado ou inválido no firebase-admin.");
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

const missingAdminEnv = [
  ['FIREBASE_ADMIN_PROJECT_ID', projectId],
  ['FIREBASE_ADMIN_CLIENT_EMAIL', clientEmail],
  ['FIREBASE_ADMIN_PRIVATE_KEY', privateKey],
].filter(([, value]) => !value).map(([name]) => name);

export const firebaseAdminConfigured = missingAdminEnv.length === 0;

let adminApp: App | null = null;

if (firebaseAdminConfigured) {
  adminApp = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: projectId!,
      clientEmail: clientEmail!,
      privateKey: privateKey!,
    }),
    projectId: projectId!,
  });
} else {
  // Development/preview may not receive Hostinger secrets. Keep the server up,
  // but DO NOT create a projectId-only Admin app or fall back to ADC.
  console.warn(
    `[Firebase Admin] Indisponível neste ambiente. Variáveis ausentes: ${missingAdminEnv.join(', ')}`
  );
}

export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;
export const adminDb: Firestore | null = adminApp
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || '(default)')
  : null;
