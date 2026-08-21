const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (!showInstForm) {
                      const nextNum = certSequence.nextNumber || 1;
                      setInstCertNumber(\`\${certSequence.prefix}\${nextNum}\`);
                    }
                    setShowInstForm(!showInstForm);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Instrumento</span>
                </button>
              </div>`;

const newStr = `              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadCalibrationsTemplate}
                  className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Baixar Modelo de Excel para Importação de Calibrações"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Baixar Modelo</span>
                </button>
                <label
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Importar Calibrações via Excel"
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Importar Calibrações</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      setImportType("calibrations");
                      setActiveTab("configuracoes");
                      setConfigSubTab("import");
                      handleCSVFileChange(e);
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    if (!showInstForm) {
                      const nextNum = certSequence.nextNumber || 1;
                      setInstCertNumber(\`\${certSequence.prefix}\${nextNum}\`);
                    }
                    setShowInstForm(!showInstForm);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Instrumento</span>
                </button>
              </div>`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched calibration tab imports");
