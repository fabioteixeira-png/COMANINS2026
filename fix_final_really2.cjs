const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// It looks like the file structure is quite messed up at the top of the form.
const formDump = fs.readFileSync('form_dump.txt', 'utf-8');
const formLines = formDump.split('\n');

const cleanedFormLines = formLines.map(line => line.replace(/^\s*\d+[\t\s]+/, ''));
let originalFormStr = cleanedFormLines.join('\n');

const origFormMatch = originalFormStr.match(/<div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">[\s\S]*?<\/form>\s*<\/div>\s*\)\}/);

// Find {showInstForm && ( in the content
const showInstIdx = content.indexOf('{showInstForm && (');
// Find {/* Filters / Inventory Header */} in the content
const filterIdx = content.indexOf('{/* Filters / Inventory Header */}');

if (showInstIdx !== -1 && filterIdx !== -1) {
   let newContent = content.substring(0, showInstIdx) +
     `{showInstForm && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-display font-bold text-sm text-slate-900">Registrar Novo Instrumento de Medição</h3>
` + originalFormStr.match(/<form onSubmit=\{handleInstrumentSubmit\}[\s\S]*?<\/form>/)[0] + `
                </div>
              )}

              ` + content.substring(filterIdx);
   
   fs.writeFileSync('src/components/InternalPortal.tsx', newContent);
   console.log("Replaced full form block");
}
