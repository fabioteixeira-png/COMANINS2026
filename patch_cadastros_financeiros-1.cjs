const fs = require('fs');
let code = fs.readFileSync('src/components/finance/CadastrosFinanceiros.tsx', 'utf8');

code = code.replace(
  'export default function CadastrosFinanceiros() {',
  `export default function CadastrosFinanceiros({ requestAdminDelete }: { requestAdminDelete?: (type: string, id: string, name: string) => void }) {`
);

code = code.replace(
  `const handleDeleteAccount = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta conta bancária? Lançamentos vinculados perderão a referência.')) {
      await deleteFinanceDoc('financeBankAccounts', id);
    }
  };`,
  `const handleDeleteAccount = async (banco: any) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_bank', banco.id, \`Conta Bancária: \${banco.bankName}\`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta conta bancária? Lançamentos vinculados perderão a referência.')) {
        await deleteFinanceDoc('financeBankAccounts', banco.id);
      }
    }
  };`
);

code = code.replace(
  `const handleDeleteCategory = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria do Plano de Contas?')) {
      await deleteFinanceDoc('financeCategories', id);
    }
  };`,
  `const handleDeleteCategory = async (cat: any) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_category', cat.id, \`Categoria: \${cat.name}\`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta categoria do Plano de Contas?')) {
        await deleteFinanceDoc('financeCategories', cat.id);
      }
    }
  };`
);

code = code.replace(/handleDeleteAccount\(banco\.id\)/g, 'handleDeleteAccount(banco)');
code = code.replace(/handleDeleteCategory\(cat\.id\)/g, 'handleDeleteCategory(cat)');

fs.writeFileSync('src/components/finance/CadastrosFinanceiros.tsx', code);
