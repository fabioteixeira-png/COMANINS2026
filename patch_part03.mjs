import fs from 'node:fs';
const file = 'src/components/internal-portal/InternalPortal.part03.sourcepart';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'onClick={handleCertificatePrint}',
  'onClick={() => handleCertificatePrint(certNumber, fieldServiceTag || inst.tag)}'
);

fs.writeFileSync(file, code);
