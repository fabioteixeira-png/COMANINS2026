import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

const missingVars = [];
if (!projectId) missingVars.push('FIREBASE_ADMIN_PROJECT_ID');
if (!clientEmail) missingVars.push('FIREBASE_ADMIN_CLIENT_EMAIL');
if (!privateKey) missingVars.push('FIREBASE_ADMIN_PRIVATE_KEY');

console.log("Missing vars:", missingVars);
