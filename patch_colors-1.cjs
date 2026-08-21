const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

code = code.replace(
  'className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"',
  'className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"'
);
code = code.replace(
  'className="p-2.5 bg-indigo-600/20 rounded-xl border border-indigo-500/30 text-indigo-400"',
  'className="p-2.5 bg-emerald-600/20 rounded-xl border border-emerald-500/30 text-emerald-400"'
);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
