const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const modalCode = `
      {/* MODAL: ACESSO FORA DE HORÁRIO */}
      {showAfterHoursModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 flex flex-col items-center text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-2">
              <ShieldAlert className="h-8 w-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Acesso Restrito - Fora do Horário</h3>
            <p className="text-sm text-slate-600">
              O acesso ao sistema após as 17:30 é restrito para colaboradores com perfil Padrão/Limitado. Sem autorização, você só tem acesso aos recibos e contra-cheques.
            </p>
            <p className="text-sm text-slate-600 font-semibold">
              Para prosseguir para <b>{afterHoursTargetTab}</b>, justifique o acesso e insira a senha de um Administrador.
            </p>
            
            <form 
              className="w-full space-y-4 text-left mt-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!afterHoursJustification) {
                  alert("Por favor, preencha a justificativa de trabalho.");
                  return;
                }
                if (!afterHoursPassword) {
                  alert("Por favor, digite a senha do administrador.");
                  return;
                }
                
                const adminUser = internalUsers.find(u => (u.role === "Administrador" || u.role === "admin" || u.role === "master" || u.permissionLevel === "Administrador") && u.password === afterHoursPassword);
                
                if (!adminUser) {
                  alert("Senha de administrador incorreta.");
                  return;
                }

                try {
                  await addAccessAuditLog({
                    date: new Date().toISOString(),
                    user: currentUser?.name || currentUser?.username || "Usuário",
                    action: "ACESSO FORA DO HORÁRIO",
                    details: \`Justificativa: \${afterHoursJustification} | Aba destino: \${afterHoursTargetTab}\`,
                    authorizedBy: adminUser.name
                  });
                  setAfterHoursBypass(true);
                  setShowAfterHoursModal(false);
                  setRawActiveTab(afterHoursTargetTab);
                  if (afterHoursTargetSubTab) setRhSubTab(afterHoursTargetSubTab);
                  setAfterHoursJustification("");
                  setAfterHoursPassword("");
                } catch (err) {
                  console.error(err);
                  alert("Erro ao registrar auditoria de acesso.");
                }
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Justificativa do Trabalho Extra</label>
                <textarea
                  required
                  value={afterHoursJustification}
                  onChange={(e) => setAfterHoursJustification(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 min-h-[80px]"
                  placeholder="Ex: Plantão, manutenção urgente, etc."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Senha do Administrador</label>
                <input
                  type="password"
                  required
                  value={afterHoursPassword}
                  onChange={(e) => setAfterHoursPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500"
                  placeholder="Senha autorizadora..."
                />
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAfterHoursModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors text-sm shadow-sm"
                >
                  Autorizar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
`;

content = content.replace("{/* MODAL: EXCLUSÃO RESTRITA COM SENHA DE ADMINISTRADOR */}", modalCode + "\n      {/* MODAL: EXCLUSÃO RESTRITA COM SENHA DE ADMINISTRADOR */}");

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Modal patched");
