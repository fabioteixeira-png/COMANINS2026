const fs = require('fs');
let content = fs.readFileSync('src/components/BoxLabelSheet.tsx', 'utf8');

content = content.replace(
  '<div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">\\n        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">',
  '<div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">\\n        <div className="min-w-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">'
);

fs.writeFileSync('src/components/BoxLabelSheet.tsx', content);
