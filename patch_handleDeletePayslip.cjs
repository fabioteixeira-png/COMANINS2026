const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `const handleDeletePayslip = async (id: string) => {
    if (
      !window.confirm(
        "Tem certeza de que deseja excluir permanentemente este contra-cheque?",
      )
    )
      return;
    try {
      await deletePayslipDoc(id);
      setPayslips((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error("Erro ao deletar contra-cheque:", e);
    }
  };`;

const replacement = `const handleDeletePayslip = async (id: string) => {
    const p = payslips.find((x) => x.id === id);
    requestAdminDelete(
      "payslip",
      id,
      \`Contra-cheque \${p?.month || ''} (\${p?.employeeName || ''})\`
    );
  };`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
