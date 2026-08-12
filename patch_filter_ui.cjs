const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `                    <div className="p-6 border-b border-slate-100">
                      <h3 className="font-bold text-slate-900">
                        Histórico Geral de Emissões & Logs de Segurança (LGPD)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Acompanhamento em tempo real de contra-cheques gerados e
                        quem os visualizou.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Colaborador</th>
                            <th className="px-6 py-4">Mês</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Arquivo PDF</th>
                            <th className="px-6 py-4">Visualizado</th>
                            <th className="px-6 py-4">
                              Trilha de Auditoria (IP / Data e Hora)
                            </th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...payslips]
                            .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
                            .map((p) => (`;

const replace = `                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Histórico Geral de Emissões & Logs de Segurança (LGPD)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Acompanhamento em tempo real de contra-cheques gerados e
                          quem os visualizou.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">Mês:</span>
                        <select
                          className="px-3 py-1.5 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-royal-blue"
                          value={payslipMonthFilter}
                          onChange={(e) => setPayslipMonthFilter(e.target.value)}
                        >
                          <option value="all">Todos os Meses</option>
                          {Array.from(new Set(payslips.map((p) => p.month).filter(Boolean))).sort().map((m) => (
                            <option key={m} value={m as string}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Colaborador</th>
                            <th className="px-6 py-4">Mês</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Arquivo PDF</th>
                            <th className="px-6 py-4">Visualizado</th>
                            <th className="px-6 py-4">
                              Trilha de Auditoria (IP / Data e Hora)
                            </th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[...payslips]
                            .filter((p) => payslipMonthFilter === "all" || p.month === payslipMonthFilter)
                            .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
                            .map((p) => (`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
