const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

code = code.replace(
  'import {\n  syncEmployeeAsos,\n  safeFetch } from "../utils/apiClient";',
  'import {\n  safeFetch } from "../utils/apiClient";'
);

code = code.replace(
  'import {  syncEmployeeAsos, safeFetch } from "../utils/apiClient";',
  'import { safeFetch } from "../utils/apiClient";'
);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
