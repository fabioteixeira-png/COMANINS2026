const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `                      </select>
                    </div>
                  </div>`;

const newStr = `                      </select>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-600 font-bold mb-1 text-sm">
                          Temperatura (ºC) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={benchTemperature}
                          onChange={(e) => setBenchTemperature(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Ex: 20.0"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue text-sm"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Regra: 20ºC ± 5ºC</p>
                      </div>
                      <div>
                        <label className="block text-slate-600 font-bold mb-1 text-sm">
                          Umidade (%) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={benchHumidity}
                          onChange={(e) => setBenchHumidity(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="Ex: 50"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-royal-blue text-sm"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Regra: 50% ± 20%</p>
                      </div>
                    </div>
                  </div>`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched render template");
