const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

content = content.replace(/              <\/div>\s*<\/div>\s*<\/div>\s*\{\/\* NOVO BLOCO/g, "              </div>\\n            </div>\\n                        {/* NOVO BLOCO");
fs.writeFileSync('src/components/InternalPortal.tsx', content);
