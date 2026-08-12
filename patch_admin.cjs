const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase-admin.ts', 'utf8');

code = code.replace(
  "import firebaseConfig from '../../firebase-applet-config.json';",
  "import fs from 'fs';\nimport path from 'path';\nconst firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));"
);

fs.writeFileSync('src/lib/firebase-admin.ts', code);
