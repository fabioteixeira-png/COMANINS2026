const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPortal.tsx', 'utf8');

const renderOriginal = `                {filteredInstruments.map(inst => {
                  const hasCertificate = inst.status === 'Calibrado' || inst.status === 'Entregue';
                  return (
                    <tr key={inst.id} className="hover:bg-slate-55 transition-colors">
                      <td className="p-4">
                        <span className="font-mono bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 font-bold text-xs">
                          {inst.certificateNumber || inst.coma || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{inst.description}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{inst.model || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        <span className="text-xs font-semibold">{inst.tag || 'N/A'}</span>
                      </td>
                      <td className="p-4 text-slate-600">
                        <span className="font-mono text-xs">{inst.rangeMin}/{inst.rangeMax} {inst.unit}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          <span className={\`px-2 py-0.5 rounded font-mono font-bold text-[9px] w-fit uppercase \${
                            inst.status === 'Aguardando Triagem' 
                              ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                              : inst.status === 'Em Calibração' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }\`}>
                            {inst.status === 'Aguardando Triagem' ? 'Aguardando Triagem' : inst.status}
                          </span>`;

const renderReplacement = `                {filteredInstruments.map(inst => {
                  const dStatus = displayStatuses.get(inst.id) || inst.status;
                  const hasCertificate = dStatus === 'Calibrado' || dStatus === 'Entregue' || dStatus === 'Disponível para Retirada';
                  return (
                    <tr key={inst.id} className="hover:bg-slate-55 transition-colors">
                      <td className="p-4">
                        <span className="font-mono bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 font-bold text-xs">
                          {inst.certificateNumber || inst.coma || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{inst.description}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{inst.model || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        <span className="text-xs font-semibold">{inst.tag || 'N/A'}</span>
                      </td>
                      <td className="p-4 text-slate-600">
                        <span className="font-mono text-xs">{inst.rangeMin}/{inst.rangeMax} {inst.unit}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          <span className={\`px-2 py-0.5 rounded font-mono font-bold text-[9px] w-fit uppercase \${
                            dStatus === 'Aguardando Triagem' 
                              ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                              : (dStatus === 'Em Calibração' || dStatus === 'Aguardando Calibração') 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }\`}>
                            {dStatus}
                          </span>`;

code = code.replace(renderOriginal, renderReplacement);

fs.writeFileSync('src/components/ClientPortal.tsx', code);
