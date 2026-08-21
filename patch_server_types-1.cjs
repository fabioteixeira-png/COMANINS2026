const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "import { requireAuth, AuthRequest } from './src/middleware/auth.ts';",
  "import { requireAuth } from './src/middleware/auth.ts';\nimport type { AuthRequest } from './src/middleware/auth.ts';"
);

fs.writeFileSync('server.ts', code);
