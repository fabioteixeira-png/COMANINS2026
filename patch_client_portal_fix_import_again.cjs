const fs = require('fs');

let content = fs.readFileSync('src/components/ClientPortal.tsx', 'utf-8');

content = content.replace(
  "import { FieldServiceRecord } from './FieldService';",
  ""
);

content = content.replace(
  "import { syncFieldServiceRecords } from '../lib/firebase';",
  "import { syncFieldServiceRecords, FieldServiceRecord } from '../lib/firebase';"
);

fs.writeFileSync('src/components/ClientPortal.tsx', content);
console.log("Patched FieldServiceRecord import correctly");
