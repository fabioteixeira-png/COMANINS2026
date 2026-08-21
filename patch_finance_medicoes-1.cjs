const fs = require('fs');
let code = fs.readFileSync('src/components/finance/FinanceMedicoes.tsx', 'utf8');

code = code.replace(
  'export default function FinanceMedicoes() {',
  `export default function FinanceMedicoes({ requestAdminDelete }: { requestAdminDelete?: (type: string, id: string, name: string) => void }) {`
);

code = code.replace(
  `const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta medição?')) {
      await deleteFinanceMeasurement(id);
    }
  };`,
  `const handleDelete = async (med: FinanceMeasurement) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_measurement', med.id, \`Medição: \${med.title}\`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta medição?')) {
        await deleteFinanceMeasurement(med.id);
      }
    }
  };`
);

code = code.replace(/handleDelete\(med\.id\)/g, 'handleDelete(med)');

fs.writeFileSync('src/components/finance/FinanceMedicoes.tsx', code);
