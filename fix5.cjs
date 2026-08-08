const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// Missing opening div? Let's check openTags for the form block. 
// A form has -1 open divs, which means a div was closed that wasn't opened, or an opening tag was lost.
// The form was working before the replacement chunk...
// Let's replace the ENTIRE form block from form_dump.txt properly.

let origForm = fs.readFileSync('form_dump.txt', 'utf-8');
const lines = origForm.split('\n');
const strippedFormLines = lines.map(line => line.replace(/^\s*\d+\t/, ''));
let strippedForm = strippedFormLines.join('\n');

const match = strippedForm.match(/<form onSubmit=\{handleInstrumentSubmit\}[\s\S]*?<\/form>/);
if (match) {
  let originalFormStr = match[0];
  
  // We need to apply the replacement to originalFormStr.
  const badTarget = `                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-slate-500 mb-1">Faixa de Medição (Min / Max)</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number"
                            step="any"
                            
                            placeholder="Min"
                            value={instRangeMin}
                            onChange={(e) => setInstRangeMin(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono text-center"
                          />
                          <span className="text-slate-500 font-bold text-lg">/</span>
                          <input 
                            type="number"
                            step="any"
                            
                            placeholder="Max"
                            value={instRangeMax}
                            onChange={(e) => setInstRangeMax(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono text-center"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Faixa 2 (Opcional)</label>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number"
                            step="any"
                            placeholder="Min"
                            value={instRangeMin2}
                            onChange={(e) => setInstRangeMin2(parseFloat(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono text-center"
                          />
                          <span className="text-slate-500 font-bold text-lg">/</span>
                          <input 
                            type="number"
                            step="any"
                            placeholder="Max"
                            value={instRangeMax2}
                            onChange={(e) => setInstRangeMax2(parseFloat(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono text-center"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-500 mb-1">Unidade</label>
                        <select 
                          
                          value={instUnit}
                          onChange={(e) => setInstUnit(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono"
                        >
                          <option value="">Selecione...</option>
                          {(dropdownOptions.unidade || []).map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-slate-500 mb-1">Unidade 2 (Opcional)</label>
                        <select 
                          value={instUnit2}
                          onChange={(e) => setInstUnit2(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono"
                        >
                          <option value="">Selecione...</option>
                          {(dropdownOptions.unidade || []).map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      
                      
                    </div>`;

  const newLayout = `                    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-slate-500 mb-1">Faixa de Medição (Min / Max)</label>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="number"
                              step="any"
                              placeholder="Min"
                              value={instRangeMin}
                              onChange={(e) => setInstRangeMin(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono text-center"
                            />
                            <span className="text-slate-500 font-bold text-lg">/</span>
                            <input 
                              type="number"
                              step="any"
                              placeholder="Max"
                              value={instRangeMax}
                              onChange={(e) => setInstRangeMax(parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono text-center"
                            />
                          </div>
                        </div>
                        <div className="col-span-1">
                          <label className="block text-slate-500 mb-1">Unidade</label>
                          <select 
                            value={instUnit}
                            onChange={(e) => setInstUnit(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono"
                          >
                            <option value="">Selecione...</option>
                            {(dropdownOptions.unidade || []).map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-slate-500 mb-1">Faixa 2 (Opcional)</label>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="number"
                              step="any"
                              placeholder="Min"
                              value={instRangeMin2}
                              onChange={(e) => setInstRangeMin2(parseFloat(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono text-center"
                            />
                            <span className="text-slate-500 font-bold text-lg">/</span>
                            <input 
                              type="number"
                              step="any"
                              placeholder="Max"
                              value={instRangeMax2}
                              onChange={(e) => setInstRangeMax2(parseFloat(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono text-center"
                            />
                          </div>
                        </div>
                        <div className="col-span-1">
                          <label className="block text-slate-500 mb-1">Unidade 2 (Opcional)</label>
                          <select 
                            value={instUnit2}
                            onChange={(e) => setInstUnit2(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue font-mono"
                          >
                            <option value="">Selecione...</option>
                            {(dropdownOptions.unidade || []).map((opt, i) => (
                              <option key={i} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>`;

  originalFormStr = originalFormStr.replace(badTarget, newLayout);
  
  const currentMatch = content.match(/<form onSubmit=\{handleInstrumentSubmit\}[\s\S]*?<\/form>/);
  if (currentMatch) {
    content = content.replace(currentMatch[0], originalFormStr);
    fs.writeFileSync('src/components/InternalPortal.tsx', content);
    console.log("Replaced form completely from dump");
  } else {
    console.log("Could not find bad form to replace");
  }

}
