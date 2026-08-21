import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf-8');

code = code.replace(/'Firestore sync ' \+ i \+ ' permission denied/g, "'Firestore sync permission denied");

fs.writeFileSync('src/lib/firebase.ts', code);
