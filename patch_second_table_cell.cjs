const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// The exact structure is:
/*
                              <td className="px-6 py-4 text-slate-900 font-semibold">
                                {p.month}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium font-mono">
*/

content = content.replace(
  '<td className="px-6 py-4 text-slate-900 font-semibold">\\n                                {p.month}\\n                              </td>\\n                              <td className="px-6 py-4">',
  '<td className="px-6 py-4 text-slate-900 font-semibold">\\n                                {p.month}\\n                              </td>\\n                              <td className="px-6 py-4 font-semibold text-slate-800">\\n                                {p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}\\n                              </td>\\n                              <td className="px-6 py-4">'
);

// Fix the \n literal
content = content.replace(/\\n                            <th/g, '\\n                            <th');

fs.writeFileSync('src/components/InternalPortal.tsx', content);
