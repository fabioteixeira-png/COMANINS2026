const fs = require('fs');
let code = fs.readFileSync('src/middleware/auth.ts', 'utf8');

code = code.replace(
  "import { Request, Response, NextFunction } from 'express';",
  "import type { Request, Response, NextFunction } from 'express';"
);

fs.writeFileSync('src/middleware/auth.ts', code);
