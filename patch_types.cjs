const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const interfaceStr = `
export interface AccessAuditLog {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
  authorizedBy?: string;
}
`;
if (!content.includes('export interface AccessAuditLog')) {
  content += interfaceStr;
  fs.writeFileSync('src/types.ts', content);
  console.log("Patched types.ts");
} else {
  console.log("Already patched");
}
