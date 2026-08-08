const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// Replace in both tables
content = content.replace(
  '<th className="px-6 py-4">Cargo / Função</th>',
  '<th className="px-6 py-4">Tipo</th>\\n                            <th className="px-6 py-4">Cargo / Função</th>'
);
content = content.replace(
  '<th className="px-6 py-4">Cargo / Função</th>',
  '<th className="px-6 py-4">Tipo</th>\\n                            <th className="px-6 py-4">Cargo / Função</th>'
);

content = content.replace(
  '<td className="px-6 py-4">{p.employeeRole}</td>',
  '<td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>\\n                                <td className="px-6 py-4">{p.employeeRole}</td>'
);
content = content.replace(
  '<td className="px-6 py-4">{p.employeeRole}</td>',
  '<td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>\\n                                <td className="px-6 py-4">{p.employeeRole}</td>'
);

// We need to also pass the correct documentType to the API payload when viewing
content = content.replace(
  'employeeName: payslip.employeeName,',
  'employeeName: payslip.employeeName,\\n        documentType: payslip.documentType === "alimentacao" ? "Recibo de Alimentação" : payslip.documentType === "transporte" ? "Recibo de Vale Transporte" : "Contra-cheque",'
);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
