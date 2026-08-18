const fs = require('fs');

let content = fs.readFileSync('src/components/ClientPortal.tsx', 'utf-8');

const mainStart = '<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:hidden">';
const newMainContent = `
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:hidden">
        {client.isFieldService ? (
          <>
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Building className="w-40 h-40 text-royal-blue" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-royal-blue text-[10px] font-bold rounded uppercase tracking-wider font-mono border border-blue-100">
                    Acesso Serviço de Campo
                  </span>
                  <span className="text-xs text-slate-500 font-mono">• {client.city}</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900">{client.name}</h1>
                  <p className="text-slate-600 text-xs mt-1 max-w-2xl leading-relaxed">
                    Bem-vindo ao portal de Serviço de Campo. Abaixo estão listados os certificados disponíveis vinculados aos serviços realizados.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Certificados Disponíveis</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="p-4 font-semibold">Certificado</th>
                      <th className="p-4 font-semibold">TAG</th>
                      <th className="p-4 font-semibold">Equipamento</th>
                      <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const extractNum = (s: string) => String(s || '').replace(/\\D/g, '');
                      const correlatedRecords = fieldServiceRecords.map(fsRecord => {
                        const recNum = extractNum(fsRecord.certificate);
                        const inst = instruments.find(i => extractNum(i.certificateNumber) === recNum);
                        if (inst) {
                           return {
                             fsRecord,
                             inst
                           };
                        }
                        return null;
                      }).filter(Boolean);

                      if (correlatedRecords.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-500">
                              Nenhum certificado disponível no momento.
                            </td>
                          </tr>
                        );
                      }

                      return correlatedRecords.map(({ fsRecord, inst }: any, idx: number) => {
                        const report = reports.find(r => r.instrumentId === inst.id);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-4 font-mono font-medium">{fsRecord.certificate || inst.certificateNumber}</td>
                            <td className="p-4">{fsRecord.tag || inst.tag || '-'}</td>
                            <td className="p-4">{fsRecord.equipamento || '-'}</td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => {
                                  if (report) {
                                    setSelectedReport(report);
                                    setSelectedInstrument(inst);
                                    setFsTag(fsRecord.tag || '');
                                    setFsEquip(fsRecord.equipamento || '');
                                  } else {
                                    alert('Certificado oficial ainda não emitido para este instrumento.');
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5 ml-auto"
                              >
                                <Printer className="w-4 h-4" />
                                <span>Imprimir</span>
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
`;

content = content.replace(mainStart, newMainContent);

const mainEnd = '</main>';
content = content.replace(mainEnd, '          </>\n        )}\n      </main>');


fs.writeFileSync('src/components/ClientPortal.tsx', content);
console.log("Patched ClientPortal UI conditional.");
