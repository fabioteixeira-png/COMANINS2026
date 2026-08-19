const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceManagement.tsx', 'utf-8');

// Replace the entire header chunk that references operationMode and handleClearDatabase
const startMarker = `          {/* Active status indicator */}`;
const endMarker = `      {/* Horizontal Scrollable Menu */}`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `          {/* Active status indicator */}
          <div className="mt-3 flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              🟢 AMBIENTE DE PRODUÇÃO ATIVO
            </span>
          </div>
        </div>
      </div>
      
      {/* Information Alert Box */}
      <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl flex items-start space-x-3">
        <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 font-medium leading-relaxed">
          <span className="font-extrabold block mb-0.5">Produção em Tempo Real</span>
          O sistema está lendo e gravando informações reais diretamente no banco de dados corporativo.
          Clique em <strong className="font-bold">Cadastros Financeiros</strong> para configurar contas bancárias e categorias padrão, se necessário.
        </div>
      </div>

`;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync('src/components/FinanceManagement.tsx', content);
  console.log("Patched FinanceManagement.tsx successfully.");
} else {
  console.log("Could not find markers.");
}
