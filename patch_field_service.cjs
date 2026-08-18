const fs = require('fs');
let code = fs.readFileSync('src/components/FieldService.tsx', 'utf8');

// 1. Update normalizeKey
code = code.replace(
  "const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');",
  "const normalizeKey = (k: string) => k.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');"
);

// 2. Add cliente to filters
code = code.replace(
  "certificate: '', tag: '', equipamento: '', localizacao: '',",
  "certificate: '', cliente: '', tag: '', equipamento: '', localizacao: '',"
);

// 3. Add cliente to template download
code = code.replace(
  "'Certificado': '',",
  "'Certificado': '',\n      'Cliente': '',"
);

// 4. Add cliente extraction
code = code.replace(
  "tag: String(normalizedRow['tag'] || ''),",
  "cliente: String(normalizedRow['cliente'] || ''),\n            tag: String(normalizedRow['tag'] || ''),"
);

// 5. Add cliente to export excel
code = code.replace(
  "'Certificado': r.certificate,",
  "'Certificado': r.certificate,\n      'Cliente': r.cliente || '',"
);

// 6. Add cliente to AI processing
code = code.replace(
  "tag: data.tag || '',",
  "cliente: data.cliente || '',\n        tag: data.tag || '',"
);

// 7. Table Header
const thCertificado = `<th className="px-4 py-3 min-w-[120px]">
                  Certificado
                  <input type="text" value={filters.certificate} onChange={e=>handleFilterChange('certificate', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>`;
const thCliente = `<th className="px-4 py-3 min-w-[150px]">
                  Cliente
                  <input type="text" value={filters.cliente} onChange={e=>handleFilterChange('cliente', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>`;
code = code.replace(thCertificado, thCertificado + '\n                ' + thCliente);

// 8. Table Body
const tdCertificado = `<td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{record.certificate}</td>`;
const tdCliente = `<td className="px-4 py-3 whitespace-nowrap">{record.cliente || '-'}</td>`;
code = code.replace(tdCertificado, tdCertificado + '\n                    ' + tdCliente);

// 9. Add Cliente to Form Modal
const formCertificado = `<div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Certificado *</label>
                  <input type="text" value={formData.certificate || ''} onChange={e => setFormData({...formData, certificate: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Ex: CERT-001" />
                </div>`;
const formCliente = `<div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cliente</label>
                  <input type="text" value={formData.cliente || ''} onChange={e => setFormData({...formData, cliente: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Nome do cliente..." />
                </div>`;
code = code.replace(formCertificado, formCertificado + '\n                ' + formCliente);

fs.writeFileSync('src/components/FieldService.tsx', code);
console.log('patched FieldService.tsx');
