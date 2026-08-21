const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

content = content.replace(
  /setSelectedCertificateId\(""\);/g,
  'setSelectedCertificateId("");\n                  setFieldServiceEquip("");'
);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched InternalPortal.tsx clear successfully.");
