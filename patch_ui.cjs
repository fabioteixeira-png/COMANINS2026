const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const monthInputBlock = `              {/* Reference Month */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Mês de Referência
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Julho/2026"
                  value={newPayslipMonth}
                  onChange={(e) => setNewPayslipMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue text-sm"
                />
              </div>`;

const documentTypeBlock = `
              {/* Document Type */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs">
                  Tipo de Documento
                </label>
                <select
                  required
                  value={newPayslipDocumentType}
                  onChange={(e) => setNewPayslipDocumentType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue text-sm"
                >
                  <option value="holerite">Contra-cheque (Holerite)</option>
                  <option value="alimentacao">Recibo de Alimentação</option>
                  <option value="transporte">Recibo de Vale Transporte</option>
                </select>
              </div>`;

content = content.replace(monthInputBlock, monthInputBlock + documentTypeBlock);

// Also let's rename modal headers from "Cadastrar Novo Contra-Cheque" to "Cadastrar Documento Pessoal"
content = content.replace(
  '<h3 className="text-lg font-bold text-slate-900 leading-tight">\\n                Cadastrar Novo Contra-Cheque\\n              </h3>',
  '<h3 className="text-lg font-bold text-slate-900 leading-tight">\\n                Cadastrar Documento (RH)\\n              </h3>'
);

content = content.replace(
  'Cadastrar Novo Contra-Cheque',
  'Cadastrar Novo Documento (RH)'
);

content = content.replace(
  'Arquivo Contra-cheque (PDF)',
  'Arquivo do Documento (PDF)'
);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
