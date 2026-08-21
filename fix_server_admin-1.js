import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace getDocs(collection(firestoreDb, 'xyz'))
code = code.replace(/getDocs\(collection\(firestoreDb,\s*(['"`][^'"`]+['"`])\)\)/g, 'firestoreDb.collection($1).get()');
// Replace collection(firestoreDb, 'xyz')
code = code.replace(/collection\(firestoreDb,\s*(['"`][^'"`]+['"`])\)/g, 'firestoreDb.collection($1)');
// Replace getDocs(ref)
code = code.replace(/getDocs\(([^)]+)\)/g, '$1.get()');

// Replace doc(firestoreDb, 'collection', 'id')
code = code.replace(/doc\(firestoreDb,\s*(['"`][^'"`]+['"`]),\s*([^)]+)\)/g, 'firestoreDb.collection($1).doc($2)');
// Replace getDoc(ref)
code = code.replace(/getDoc\(([^)]+)\)/g, '$1.get()');
// Replace updateDoc(ref, data)
code = code.replace(/updateDoc\(([^,]+),\s*([\s\S]+?)\)/g, '$1.update($2)');
// Replace addDoc(ref, data)
code = code.replace(/addDoc\(([^,]+),\s*([\s\S]+?)\)/g, '$1.add($2)');

// Remove doc from firebase/firestore imports if it exists
code = code.replace(/import\s*\{[^}]*\}\s*from\s*['"`]firebase\/firestore['"`];?\n?/g, '');

fs.writeFileSync('server.ts', code);
