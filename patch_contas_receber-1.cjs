const fs = require('fs');
let code = fs.readFileSync('src/components/finance/ContasReceber.tsx', 'utf8');

code = code.replace(
  'export default function ContasReceber() {',
  `export default function ContasReceber({ requestAdminDelete }: { requestAdminDelete?: (type: string, id: string, name: string) => void }) {`
);

code = code.replace(
  `const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      await deleteFinanceTransaction(id);
    }
  };`,
  `const handleDelete = async (tx: FinanceTransaction) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_transaction', tx.id, \`Receita: \${tx.description}\`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta receita?')) {
        await deleteFinanceTransaction(tx.id);
      }
    }
  };`
);

// We need to change onClick={() => handleDelete(tx.id)} to handleDelete(tx)
code = code.replace(/handleDelete\(tx\.id\)/g, 'handleDelete(tx)');
code = code.replace(/hidden=\{!isUserAdmin\}/g, ''); // just in case

fs.writeFileSync('src/components/finance/ContasReceber.tsx', code);
