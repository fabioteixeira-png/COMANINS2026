const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const newFunctions = `
export interface EmployeeDocument {
  id: string;
  userId: string;
  name: string;
  type: string;
  url: string;
  date: string;
}

export async function addEmployeeDocument(docData: Omit<EmployeeDocument, 'id'>): Promise<EmployeeDocument> {
  if (!db) throw new Error("Firebase não inicializado.");
  const docRef = await addDoc(collection(db, 'employeeDocuments'), docData);
  return { id: docRef.id, ...docData };
}

export async function getEmployeeDocuments(userId: string): Promise<EmployeeDocument[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'employeeDocuments'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const docs: EmployeeDocument[] = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() } as EmployeeDocument);
    });
    return docs;
  } catch (error) {
    console.error("Erro ao buscar documentos do colaborador:", error);
    return [];
  }
}

export async function deleteEmployeeDocument(docId: string): Promise<void> {
  if (!db) throw new Error("Firebase não inicializado.");
  await deleteDoc(doc(db, 'employeeDocuments', docId));
}
`;

// Inject the new functions right before export const INITIAL_PORTAL_USERS
code = code.replace("export const INITIAL_PORTAL_USERS", newFunctions + "\nexport const INITIAL_PORTAL_USERS");

fs.writeFileSync('src/lib/firebase.ts', code);
