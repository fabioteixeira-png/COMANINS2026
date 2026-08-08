const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `                    <div className="grid grid-cols-1 gap-2">
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

const replacement = `                    <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
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

if (!content.includes(targetStr)) {
  console.log("Not found!");
  // Write target string for debugging
  fs.writeFileSync('debug_target.txt', targetStr);
  process.exit(1);
}

fs.writeFileSync('src/components/InternalPortal.tsx', content.replace(targetStr, replacement));
console.log("Success");
