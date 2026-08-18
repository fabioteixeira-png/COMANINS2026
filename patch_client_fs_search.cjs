const fs = require('fs');

let content = fs.readFileSync('src/components/ClientPortal.tsx', 'utf-8');

const searchHtml = `
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-bold text-slate-900">Certificados Disponíveis</h3>
                <div className="relative w-full sm:w-auto">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar certificado, TAG..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-royal-blue focus:border-royal-blue w-full sm:w-64"
                  />
                </div>
              </div>
`;

content = content.replace(
  '<div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">\n                <h3 className="font-bold text-slate-900">Certificados Disponíveis</h3>\n              </div>',
  searchHtml
);

content = content.replace(
  '}).filter(Boolean);',
  '}).filter(Boolean).filter(({ fsRecord, inst }: any) => {\n                        const term = searchTerm.trim().toLowerCase();\n                        if (!term) return true;\n                        const cert = (fsRecord.certificate || inst.certificateNumber || "").toLowerCase();\n                        const tag = (fsRecord.tag || inst.tag || "").toLowerCase();\n                        const equip = (fsRecord.equipamento || "").toLowerCase();\n                        return cert.includes(term) || tag.includes(term) || equip.includes(term);\n                      });'
);

fs.writeFileSync('src/components/ClientPortal.tsx', content);
console.log("Patched Field Service search.");
