const fs = require('fs');
let ipContent = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

ipContent = ipContent.replace(
  '<span className="font-bold">Tag Cliente:</span>{" "}',
  '<span className="font-bold">TAG do Cliente:</span>{" "}'
);

fs.writeFileSync('src/components/InternalPortal.tsx', ipContent);
console.log("Patched Tag string.");
