const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the admin settings block in nav
content = content.replace(
  /\{isUserAdmin && \(\s*<>\s*<div className="pt-4 pb-1"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Admin<\/span><\/div>/,
  '{isUserAdmin && (\n            <>\n              <div className="pt-4 pb-1"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Admin</span></div>'
);

// I might have broken other things with sed 's/<>{isUserAdmin...'.
// Actually, earlier I had ` <>{isUserAdmin && (` there. Let's just restore it properly.
// Wait, the original code had:
//          {isUserAdmin && (
//            <>
//              <div className="pt-4 pb-1">...Admin</span></div>
content = content.replace(
  /\{isUserAdmin && \(\s*<>\s*<div className="pt-4 pb-1">.*?Admin.*?<\/span><\/div>/,
  '{isUserAdmin && (\n            <>\n              <div className="pt-4 pb-1"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Admin</span></div>'
);
fs.writeFileSync(file, content);
console.log("Fixed nav block");
