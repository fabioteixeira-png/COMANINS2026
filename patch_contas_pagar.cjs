const fs = require('fs');
let code = fs.readFileSync('src/components/finance/ContasPagar.tsx', 'utf8');

code = code.replace(
  'export default function ContasPagar() {',
  `export default function ContasPagar({ requestAdminDelete }: { requestAdminDelete?: (type: string, id: string, name: string) => void }) {`
);

code = code.replace(
  `const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta despesa do contas a pagar?')) {
      await deleteFinanceTransaction(id);
    }
  };`,
  `const handleDelete = async (tx: FinanceTransaction) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_transaction', tx.id, \`Despesa: \${tx.description}\`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta despesa do contas a pagar?')) {
        await deleteFinanceTransaction(tx.id);
      }
    }
  };`
);

code = code.replace(/handleDelete\(tx\.id\)/g, 'handleDelete(tx)');

fs.writeFileSync('src/components/finance/ContasPagar.tsx', code);
