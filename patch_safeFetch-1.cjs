const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

code = code.replace(
  'import { QRCodeSVG } from "qrcode.react";',
  'import { safeFetch } from "../utils/apiClient";\nimport { QRCodeSVG } from "qrcode.react";'
);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
