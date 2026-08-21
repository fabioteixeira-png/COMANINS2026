import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const usersSnap = await getDocs(collection(db, 'portalUsers'));
  const clientsSnap = await getDocs(collection(db, 'clients'));

  const users = usersSnap.docs.map(d => ({id: d.id, ...d.data()}));
  const clients = clientsSnap.docs.map(d => ({id: d.id, ...d.data()}));

  let internalCount = users.length;
  let clientsWithAccessCount = clients.filter(c => c.portalAccess || c.password).length;

  let compatibleInternal = 0;
  let compatibleClient = 0;
  let shortPassword = 0;
  let noPassword = 0;
  
  let usernames = new Set();
  let cnpjs = new Set();
  let duplicates = [];
  let unmigratable = [];

  for (const u of users) {
    if (!u.password) {
      noPassword++;
      unmigratable.push(`User ${u.username || u.id}: No password`);
      continue;
    }
    if (u.password.length < 6) {
      shortPassword++;
      unmigratable.push(`User ${u.username || u.id}: Password too short (${u.password})`);
      continue;
    }
    if (!u.username) {
      unmigratable.push(`User ${u.id}: No username`);
      continue;
    }
    if (usernames.has(u.username)) {
      duplicates.push(`User ${u.username}: Duplicate username`);
      continue;
    }
    usernames.add(u.username);
    compatibleInternal++;
  }

  for (const c of clients) {
    if (!c.portalAccess && !c.password) continue; // Only care about clients with access

    if (!c.password) {
      noPassword++;
      unmigratable.push(`Client ${c.cnpj || c.id}: No password`);
      continue;
    }
    if (c.password.length < 6) {
      shortPassword++;
      unmigratable.push(`Client ${c.cnpj || c.id}: Password too short (${c.password})`);
      continue;
    }
    if (!c.cnpj) {
      unmigratable.push(`Client ${c.id}: No CNPJ`);
      continue;
    }
    if (cnpjs.has(c.cnpj)) {
      duplicates.push(`Client ${c.cnpj}: Duplicate CNPJ`);
      continue;
    }
    cnpjs.add(c.cnpj);
    compatibleClient++;
  }

  console.log('--- DRY RUN RESULTS ---');
  console.log(`Quantidade de usuários internos: ${internalCount}`);
  console.log(`Quantidade de clientes com acesso: ${clientsWithAccessCount}`);
  console.log(`Usuários compatíveis com Firebase Auth: ${compatibleInternal} internos, ${compatibleClient} clientes`);
  console.log(`Senhas com menos de 6 caracteres: ${shortPassword}`);
  console.log(`Usuários sem senha (ou vazia): ${noPassword}`);
  console.log(`Possíveis duplicidades: ${duplicates.length}`);
  if (duplicates.length) console.log(duplicates);
  console.log(`Contas que não podem ser migradas (necessitam tratamento especial): ${unmigratable.length}`);
  if (unmigratable.length) console.log(unmigratable.slice(0, 20), unmigratable.length > 20 ? '...' : '');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
