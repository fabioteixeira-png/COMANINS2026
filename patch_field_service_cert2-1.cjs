const fs = require('fs');
let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

const oldLabel = `<label className="block text-xs font-bold text-slate-700 mb-1">{col.label} {col.id === 'certificate' ? '*' : ''}</label>`;
const newLabel = `<label className="block text-xs font-bold text-slate-700 mb-1">{col.label}</label>`;

content = content.replace(oldLabel, newLabel);

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched label in FieldService");
