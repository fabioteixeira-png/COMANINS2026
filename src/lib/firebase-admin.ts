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
const privateKeyBase64 = process.env.FIREBASE_ADMIN_PRIVATE_KEY_B64?.trim();

const decodePrivateKey = (value?: string): string | undefined => {
  if (!value) return undefined;

  try {
    const decoded = Buffer.from(value.replace(/\s+/g, ''), 'base64')
      .toString('utf8')
      .trim();

    if (
      !decoded.startsWith('-----BEGIN PRIVATE KEY-----') ||
      !decoded.endsWith('-----END PRIVATE KEY-----')
    ) {
      return undefined;
    }

    return decoded;
  } catch {
    return undefined;
  }
};

const privateKey = decodePrivateKey(privateKeyBase64);

const missingAdminEnv = [
  ['FIREBASE_ADMIN_PROJECT_ID', projectId],
  ['FIREBASE_ADMIN_CLIENT_EMAIL', clientEmail],
  ['FIREBASE_ADMIN_PRIVATE_KEY_B64', privateKeyBase64],
].filter(([, value]) => !value).map(([name]) => name);

let adminApp: App | null = null;

if (missingAdminEnv.length === 0 && privateKey) {
  try {
    adminApp = getApps()[0] ?? initializeApp({
      credential: cert({
        projectId: projectId!,
        clientEmail: clientEmail!,
        privateKey,
      }),
      projectId: projectId!,
    });
  } catch {
    // Never let a malformed secret take the public site offline. Protected
    // administrative routes will fail closed because adminAuth/adminDb stay null.
    console.error(
      '[Firebase Admin] Falha ao inicializar credencial. Verifique FIREBASE_ADMIN_PRIVATE_KEY_B64.'
    );
  }
} else if (missingAdminEnv.length > 0) {
  // Development/preview may not receive Hostinger secrets. Keep the server up,
  // but DO NOT create a projectId-only Admin app or fall back to ADC.
  console.warn(
    `[Firebase Admin] Indisponível neste ambiente. Variáveis ausentes: ${missingAdminEnv.join(', ')}`
  );
} else {
  console.error(
    '[Firebase Admin] FIREBASE_ADMIN_PRIVATE_KEY_B64 presente, mas o conteúdo decodificado não é uma chave PEM válida.'
  );
}

export const firebaseAdminConfigured = adminApp !== null;
export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;
export const adminDb: Firestore | null = adminApp
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || '(default)')
  : null;
