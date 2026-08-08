const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// Fix headers
content = content.replace(
  '<th className="px-6 py-4">Tipo</th>\\n                            <th className="px-6 py-4">Tipo</th>\\n                            <th className="px-6 py-4">Cargo / Função</th>',
  '<th className="px-6 py-4">Tipo</th>\\n                            <th className="px-6 py-4">Cargo / Função</th>'
);
content = content.replace(
  '<th className="px-6 py-4">Tipo</th>\\n                            <th className="px-6 py-4">Tipo</th>\\n                            <th className="px-6 py-4">Cargo / Função</th>',
  '<th className="px-6 py-4">Tipo</th>\\n                            <th className="px-6 py-4">Cargo / Função</th>'
);

// Fix cells
content = content.replace(
  '<td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>\\n                                <td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>\\n                                <td className="px-6 py-4">{p.employeeRole}</td>',
  '<td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>\\n                                <td className="px-6 py-4">{p.employeeRole}</td>'
);
content = content.replace(
  '<td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>\\n                                <td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>\\n                                <td className="px-6 py-4">{p.employeeRole}</td>',
  '<td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>\\n                                <td className="px-6 py-4">{p.employeeRole}</td>'
);


fs.writeFileSync('src/components/InternalPortal.tsx', content);
