const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// Update API Payload
content = content.replace(
  'documentType: payslip.documentType === "alimentacao" ? "Recibo de Alimentação" : payslip.documentType === "transporte" ? "Recibo de Vale Transporte" : "Contra-cheque",',
  'documentType: payslip.documentType === "alimentacao" ? "Recibo de Alimentação" : payslip.documentType === "transporte" ? "Recibo de Vale Transporte" : payslip.documentType === "espelho_ponto" ? "Espelho de Ponto" : "Contra-cheque",'
);

// Update First Table
content = content.replace(
  '<td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : "Contra-cheque"}</td>',
  '<td className="px-6 py-4 font-semibold text-slate-800">{p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : p.documentType === "espelho_ponto" ? "Espelho de Ponto" : "Contra-cheque"}</td>'
);

// Update Second Table (It's missing the cell completely, let's inject it after p.month)
content = content.replace(
  /<td className="px-6 py-4 text-slate-900 font-semibold">\s*\{p.month\}\s*<\/td>\s*<td className="px-6 py-4">/g,
  '<td className="px-6 py-4 text-slate-900 font-semibold">\\n                                {p.month}\\n                              </td>\\n                              <td className="px-6 py-4 font-semibold text-slate-800">\\n                                {p.documentType === "alimentacao" ? "Alimentação" : p.documentType === "transporte" ? "Transporte" : p.documentType === "espelho_ponto" ? "Espelho de Ponto" : "Contra-cheque"}\\n                              </td>\\n                              <td className="px-6 py-4">'
);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
