import fs from 'node:fs';
const file = 'scripts/internal-portal-source.mjs';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const EXPECTED_SHA256 = "cb31e02f3e252d5342327b1fafab815983c135aa3440c31a646ace63d6b384a9";',
  'const EXPECTED_SHA256 = "d550ef444e8242669a6e9cf901c827feb59655e911967cdb99db755b5477fcd4";'
);

fs.writeFileSync(file, code);
