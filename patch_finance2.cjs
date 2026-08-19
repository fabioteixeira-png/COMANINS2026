const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceManagement.tsx', 'utf-8');

// Remove operationMode state and related functions completely
content = content.replace(/const \[operationMode, setOperationMode\] = useState<.*?>(.*?\n){3}\n/g, '');
content = content.replace(/const handleToggleMode = \([^)]*\) => {[\s\S]*?};\n\n/g, '');

// Clean up the UI
const targetHeaderStr = `                    {/* Active status indicator */}
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Modo do Sistema:</span>
            {operationMode === 'homologado' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                🟢 HOMOLOGADO (DADOS REAIS FIRESTORE)
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                🔵 SIMULAÇÃO (DADOS DE TESTE)
              </span>
            )}
          </div>
        </div>

        {/* Operational Switch & database tools */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleToggleMode('homologado')}
              className={\`px-3 py-1.5 rounded-md text-xs font-bold transition-all \${
                operationMode === 'homologado' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }\`}
            >
              Homologado
            </button>
            <button
              onClick={() => handleToggleMode('simulacao')}
              className={\`px-3 py-1.5 rounded-md text-xs font-bold transition-all \${
                operationMode === 'simulacao' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }\`}
            >
              Simulação
            </button>
          </div>

          {operationMode === 'homologado' && (
            <button
              onClick={handleClearDatabase}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Limpar todos os dados de testes do Firestore para homologação"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              <span>Limpar Banco de Teste</span>
            </button>
          )}
        </div>
      </div>

      {/* Information Alert Box */}
      {operationMode === 'homologado' ? (
        <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 font-medium leading-relaxed">
            <span className="font-extrabold block mb-0.5">Ambiente de Produção Homologado Ativo</span>
            O sistema está lendo e gravando informações reais diretamente no banco de dados Firestore da corporação. 
            Clique em <strong className="font-bold">Cadastros Financeiros</strong> para configurar as contas bancárias e categorias contábeis padrão se for a primeira inicialização.
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 font-medium leading-relaxed">
            <span className="font-extrabold block mb-0.5">Modo de Simulação / Treinamento Ativo</span>
            O sistema está utilizando dados fictícios para fins de apresentação, demonstração comercial ou treinamento de novos usuários da diretoria. 
            Nenhuma ação neste modo alterará dados reais de produção.
          </div>
        </div>
      )}`;

const newHeaderStr = `                    {/* Active status indicator */}
          <div className="mt-3 flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              🟢 PRODUÇÃO
            </span>
          </div>
        </div>
      </div>`;

content = content.replace(targetHeaderStr, newHeaderStr);

fs.writeFileSync('src/components/FinanceManagement.tsx', content);
console.log("Patched FinanceManagement.tsx");
