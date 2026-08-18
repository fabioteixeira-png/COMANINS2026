const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf-8');
content = content.replace(
  '  password?: string;\n}',
  '  password?: string;\n  isFieldService?: boolean;\n}'
);
fs.writeFileSync('src/types.ts', content);
console.log("Patched types.ts");
