const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

code = code.replace(
  'import {\n  syncEmployeeAsos, safeFetch } from "../utils/apiClient";',
  ''
);

code = code.replace(
  'import {  syncEmployeeAsos, safeFetch } from "../utils/apiClient";',
  ''
);

code = code.replace(
  'import {\n  safeFetch } from "../utils/apiClient";',
  ''
);

code = code.replace(
  'import { safeFetch } from "../utils/apiClient";',
  ''
);


fs.writeFileSync('src/components/InternalPortal.tsx', code);
