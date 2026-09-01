const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace(
  "responsibleClientDocument?: string;\n  items: Array<{",
  "responsibleClientDocument?: string;\n  attachments?: string[];\n  items: Array<{"
);

fs.writeFileSync('src/types.ts', content);
