const fs = require('fs');

let content = fs.readFileSync('src/types.ts', 'utf-8');

const targetStr = `  approved: boolean;
  observations: string;`;

const newStr = `  approved: boolean;
  observations: string;
  temperature?: number;
  humidity?: number;`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/types.ts', content);
console.log("Patched types");
