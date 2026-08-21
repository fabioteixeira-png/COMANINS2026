const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceContratos.tsx', 'utf8');

code = code.replace(
  'export default function FinanceContratos() {',
  `export default function FinanceContratos({ requestAdminDelete }: { requestAdminDelete?: (type: string, id: string, name: string) => void }) {`
);

code = code.replace(
  `const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este contrato?')) {
      await deleteFinanceContract(id);
    }
  };`,
  `const handleDelete = async (contract: FinanceContract) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_contract', contract.id, \`Contrato: \${contract.title}\`);
    } else {
      if (confirm('Tem certeza que deseja excluir este contrato?')) {
        await deleteFinanceContract(contract.id);
      }
    }
  };`
);

code = code.replace(/handleDelete\(contract\.id\)/g, 'handleDelete(contract)');

fs.writeFileSync('src/components/finance/FinanceContratos.tsx', code);
