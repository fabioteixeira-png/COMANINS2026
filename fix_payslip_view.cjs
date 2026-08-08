const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const target1 = `                {!isLimitedRole && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setRhSubTab('cadastro')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Voltar</span>
                    </button>
                    <button 
                      onClick={() => setShowCreatePayslipModal(true)}
                      className="bg-royal-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Anexar Contra-cheque PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Subtabs for HR/Admin users */}
              {!isLimitedRole && (
                <div className="flex border-b border-slate-200 mb-6">
                  <button
                    className={\`px-4 py-3 font-medium text-sm transition-colors border-b-2 \${
                      activePayslipTab === 'meus'
                        ? 'border-royal-blue text-royal-blue'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }\`}
                    onClick={() => setActivePayslipTab('meus')}
                  >
                    Meus Contra-cheques
                  </button>
                  <button
                    className={\`px-4 py-3 font-medium text-sm transition-colors border-b-2 \${
                      activePayslipTab === 'gerenciar'
                        ? 'border-royal-blue text-royal-blue'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }\`}
                    onClick={() => setActivePayslipTab('gerenciar')}
                  >
                    Gerenciar Contra-cheques & Auditoria (LGPD)
                  </button>
                </div>
              )}

              {/* MEUS CONTRA-CHEQUES */}
              {((isLimitedRole) || (!isLimitedRole && activePayslipTab === 'meus')) && (`;

const replacement1 = `                {(isUserAdmin || currentUser?.role === 'Recursos Humanos (RH)' || currentUser?.role === 'Financeiro') && (
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setRhSubTab('cadastro')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Voltar</span>
                    </button>
                    <button 
                      onClick={() => setShowCreatePayslipModal(true)}
                      className="bg-royal-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Anexar Contra-cheque PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Subtabs for HR/Admin users */}
              {(isUserAdmin || currentUser?.role === 'Recursos Humanos (RH)' || currentUser?.role === 'Financeiro') && (
                <div className="flex border-b border-slate-200 mb-6">
                  <button
                    className={\`px-4 py-3 font-medium text-sm transition-colors border-b-2 \${
                      activePayslipTab === 'meus'
                        ? 'border-royal-blue text-royal-blue'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }\`}
                    onClick={() => setActivePayslipTab('meus')}
                  >
                    Meus Contra-cheques
                  </button>
                  <button
                    className={\`px-4 py-3 font-medium text-sm transition-colors border-b-2 \${
                      activePayslipTab === 'gerenciar'
                        ? 'border-royal-blue text-royal-blue'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }\`}
                    onClick={() => setActivePayslipTab('gerenciar')}
                  >
                    Gerenciar Contra-cheques & Auditoria (LGPD)
                  </button>
                </div>
              )}

              {/* MEUS CONTRA-CHEQUES */}
              {(!(isUserAdmin || currentUser?.role === 'Recursos Humanos (RH)' || currentUser?.role === 'Financeiro') || activePayslipTab === 'meus') && (`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync('src/components/InternalPortal.tsx', code);
  console.log("Fixed target1");
} else {
  console.log("Target 1 not found");
}

