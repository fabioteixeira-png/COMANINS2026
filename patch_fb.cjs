const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const targetImport = 'export interface PortalUser {';
const importReplacement = `import { InternalTicket } from "../types";\nexport interface PortalUser {`;
if (!content.includes('import { InternalTicket }')) {
  content = content.replace(targetImport, importReplacement);
}

const syncCode = `
export async function syncInternalTickets(callback: (tickets: InternalTicket[]) => void) {
  try {
    const q = query(collection(db, "internal_tickets"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as InternalTicket));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (error) => {
        console.error("Error in syncInternalTickets:", error);
      }
    );
  } catch (err) {
    console.error("Error setting up internal tickets sync:", err);
    return () => {};
  }
}

export async function saveInternalTicket(ticket: InternalTicket): Promise<void> {
  try {
    const docRef = doc(db, "internal_tickets", ticket.id);
    await setDoc(docRef, ticket);
  } catch (err) {
    console.error("Error saving internal ticket:", err);
    throw err;
  }
}

export async function deleteInternalTicket(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "internal_tickets", id));
  } catch (err) {
    console.error("Error deleting internal ticket:", err);
    throw err;
  }
}
`;

if (!content.includes('syncInternalTickets')) {
  content += syncCode;
  fs.writeFileSync('src/lib/firebase.ts', content);
  console.log('patched');
}
