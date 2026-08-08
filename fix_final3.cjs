const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// I will extract the whole form from form_dump.txt, and apply the grid replacement correctly, and rewrite it into InternalPortal.tsx
const origForm = fs.readFileSync('form_dump.txt', 'utf-8');
const lines = origForm.split('\n');

// The lines in form_dump.txt have numbers like:
//   1850                        }
// Let's strip the line numbers
const strippedForm = lines.map(line => line.replace(/^\s*\d+\t/, '')).join('\n');

// Let's get the form specifically.
// From <form onSubmit={handleInstrumentSubmit} ...> to </form>
const match = strippedForm.match(/<form onSubmit=\{handleInstrumentSubmit\}[\s\S]*?<\/form>/);
if (match) {
  let formStr = match[0];
  
  // Apply our layout replacement
  const targetLayout = `                    <div className="grid grid-cols-1 gap-2">
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
  
  if (formStr.includes(targetLayout)) {
    formStr = formStr.replace(targetLayout, newLayout);
  }

  // Now find the broken form in the file and replace it.
  const badFormMatch = content.match(/<form onSubmit=\{handleInstrumentSubmit\}[\s\S]*?<\/form>/);
  if (badFormMatch) {
    content = content.replace(badFormMatch[0], formStr);
    fs.writeFileSync('src/components/InternalPortal.tsx', content);
    console.log("Success replacing bad form");
  } else {
    // maybe there's no closing tag, so the regex failed. Let's do it manually.
    const startIdx = content.indexOf('<form onSubmit={handleInstrumentSubmit}');
    // We know where it ends from the other file? The div with filter search
    const endIdx = content.indexOf('{/* Filters / Inventory Header */}');
    
    if (startIdx !== -1 && endIdx !== -1) {
       const before = content.substring(0, startIdx);
       // we need to find `</div>\n              )}` right before Filters
       const suffix = `                </div>
              )}

              {/* Filters / Inventory Header */}`;
       const exactEndIdx = content.indexOf(suffix);
       if (exactEndIdx !== -1) {
           const after = content.substring(exactEndIdx);
           
           content = before + formStr + '\n' + after;
           fs.writeFileSync('src/components/InternalPortal.tsx', content);
           console.log("Success replacing raw");
       } else {
           console.log("Could not find suffix");
       }
    }
  }
} else {
  console.log("Could not extract original form");
}
