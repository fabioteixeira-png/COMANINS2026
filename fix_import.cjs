const fs = require('fs');
let content = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

content = content.replace(
  "import type { PortalUser   uploadRentalAttachment,\n} from '../lib/firebase';",
  "import type { PortalUser } from '../lib/firebase';\nimport { uploadRentalAttachment } from '../lib/firebase';"
);

fs.writeFileSync('src/components/RentalManagement.tsx', content);
