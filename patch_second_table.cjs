const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// Header
content = content.replace(
  '<th className="px-6 py-4">Mês</th>',
  '<th className="px-6 py-4">Mês</th>\\n                            <th className="px-6 py-4">Tipo</th>'
);

// Cell
content = content.replace(
  '<td className="px-6 py-4">\\n                                <span className="inline-flex items-center space-x-1.5 text-xs text-slate-700 font-medium font-mono">\\n                                  <FileText className="h-4 w-4 text-red-500" />\\n                                  <span>\\n                                    {p.pdfName || "contra_cheque.pdf"}\\n                                  </span>\\n                                </span>\\n                              </td>',
  '<td className="px-6 py-4 font-semibold text-slate-800">\\n                                {p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}\\n                              </td>\\n                              <td className="px-6 py-4">\\n                                <span className="inline-flex items-center space-x-1.5 text-xs text-slate-700 font-medium font-mono">\\n                                  <FileText className="h-4 w-4 text-red-500" />\\n                                  <span>\\n                                    {p.pdfName || "contra_cheque.pdf"}\\n                                  </span>\\n                                </span>\\n                              </td>'
);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
