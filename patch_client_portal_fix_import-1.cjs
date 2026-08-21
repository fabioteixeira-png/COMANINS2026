const fs = require('fs');

let content = fs.readFileSync('src/components/ClientPortal.tsx', 'utf-8');

content = content.replace(
  "import { Client, Instrument, CalibrationReport, RncReport, FieldServiceRecord } from '../types';",
  "import { Client, Instrument, CalibrationReport, RncReport } from '../types';\nimport { FieldServiceRecord } from './FieldService';"
);

fs.writeFileSync('src/components/ClientPortal.tsx', content);
console.log("Patched FieldServiceRecord import");
