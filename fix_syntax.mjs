import fs from 'node:fs';
const file = 'src/utils/certificateDomPdf.ts';
let code = fs.readFileSync(file, 'utf8');

// I'll just remove lines 230 to 249 manually
const lines = code.split('\n');
const newLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// REMOVED')) {
    skip = true;
    continue;
  }
  if (skip && lines[i] === '};') {
    skip = false;
    continue;
  }
  if (!skip) {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync(file, newLines.join('\n'));
