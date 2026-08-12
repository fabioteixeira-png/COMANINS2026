const fs = require('fs');
let code = fs.readFileSync('src/middleware/auth.ts', 'utf8');

code = code.replace(
  "import { DecodedIdToken } from 'firebase-admin/auth';",
  "import type { DecodedIdToken } from 'firebase-admin/auth';"
);

fs.writeFileSync('src/middleware/auth.ts', code);
