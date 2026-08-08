const fs = require('fs');
let content = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

content = content.replace(
  'import { syncInternalTickets, saveInternalTicket, PortalUser, compressImage } from "../lib/firebase";',
  'import { syncInternalTickets, saveInternalTicket, PortalUser } from "../lib/firebase";\nimport { compressImageToWebResolution } from "../lib/imageCompressor";'
);

content = content.replace(
  'return () => unsub();',
  'unsub.then(u => u && u()); return () => { unsub.then(u => u && u()) };'
);

content = content.replace(
  'const files = Array.from(e.target.files);',
  'const files = Array.from(e.target.files) as File[];'
);

content = content.replace(
  'await compressImage(f)',
  'await compressImageToWebResolution(f)'
);

fs.writeFileSync('src/components/InternalCommunication.tsx', content);
console.log('patched internal communication');
