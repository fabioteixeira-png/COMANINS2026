const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `              activePayslipTab === "meus") && (
              <div className="space-y-6">
                {!lgpdConsentChecked ? (`

const newStr = `              activePayslipTab === "meus") && (
              <div className="space-y-6">
                {payslips.some(p => p.employeeId === currentUser?.id && !p.visualized && Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)) >= 11) && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg flex items-start space-x-3 shadow-sm">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-800">Acesso Restrito: Documentação Pendente</h4>
                      <p className="text-sm text-rose-700 mt-1">
                        Você possui documentação pessoal (como contra-cheques, espelhos de ponto, etc.) que está aguardando visualização há mais de 11 dias. 
                        <strong>O seu acesso às demais áreas do portal foi temporariamente bloqueado.</strong><br/>
                        Para liberar o seu acesso, por favor visualize todos os documentos pendentes abaixo (clicando no botão "Visualizar Documento").
                      </p>
                    </div>
                  </div>
                )}
                {!lgpdConsentChecked ? (`

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched banner");
