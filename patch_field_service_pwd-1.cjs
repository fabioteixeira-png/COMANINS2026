const fs = require('fs');

let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

// Import syncPortalUsers and PortalUser
content = content.replace(
  "clearAllFieldServiceRecords, deleteFieldServiceRecord",
  "clearAllFieldServiceRecords, deleteFieldServiceRecord, syncPortalUsers, PortalUser"
);

// Add state for internal users
content = content.replace(
  "  const [records, setRecords] = useState<FieldServiceRecord[]>([]);",
  "  const [records, setRecords] = useState<FieldServiceRecord[]>([]);\n  const [internalUsers, setInternalUsers] = useState<PortalUser[]>([]);"
);

// Sync internal users
content = content.replace(
  "    const unsubscribe = syncFieldServiceRecords((data) => {",
  `    const unsubscribeUsers = syncPortalUsers((users) => setInternalUsers(users));
    const unsubscribe = syncFieldServiceRecords((data) => {`
);

content = content.replace(
  "      unsubscribe.then(unsub => unsub());\n    };\n  }, []);",
  "      unsubscribe.then(unsub => unsub());\n      unsubscribeUsers.then(u => u());\n    };\n  }, []);"
);

// Update handleDeleteRecord
const oldHandleDeleteRecord = `
  const handleDeleteRecord = async (id: string) => {
    const pwd = prompt("Digite a senha de administrador para excluir este registro:");
    if (pwd === "comanins123" || pwd === "admin123" || pwd === "admin") {
      if (confirm("Tem certeza que deseja excluir?")) {
        try {
          await deleteFieldServiceRecord(id);
        } catch (e) {
          console.error(e);
          alert("Erro ao excluir.");
        }
      }
    } else if (pwd !== null) {
      alert("Senha incorreta!");
    }
  };
`;

const newHandleDeleteRecord = `
  const handleDeleteRecord = async (id: string) => {
    const pwd = prompt("Digite a senha de administrador para excluir este registro:");
    if (pwd === null) return;
    
    const isAdminValid = internalUsers.some(u => u.role === "Administrador" && u.password === pwd) || pwd === "admin" || pwd === "admin123" || pwd === "comanins123";

    if (isAdminValid) {
      if (confirm("Tem certeza que deseja excluir?")) {
        try {
          await deleteFieldServiceRecord(id);
        } catch (e) {
          console.error(e);
          alert("Erro ao excluir.");
        }
      }
    } else {
      alert("Senha incorreta! Apenas o Administrador do Sistema possui permissão para excluir registros.");
    }
  };
`;

content = content.replace(oldHandleDeleteRecord.trim(), newHandleDeleteRecord.trim());

// Update handleClearAll
const oldHandleClearAll = `
  const handleClearAll = async () => {
    const pwd = prompt("Digite a senha de administrador para limpar todos os dados:");
    if (pwd === "comanins123" || pwd === "admin123" || pwd === "admin") {
      if (confirm("Tem certeza absoluta? Isso apagará TODOS os registros!")) {
        setIsLoading(true);
        try {
          await clearAllFieldServiceRecords();
          alert("Dados limpos com sucesso.");
        } catch (e) {
          console.error(e);
          alert("Erro ao limpar dados.");
        }
        setIsLoading(false);
      }
    } else if (pwd !== null) {
      alert("Senha incorreta!");
    }
  };
`;

const newHandleClearAll = `
  const handleClearAll = async () => {
    const pwd = prompt("Digite a senha de administrador para limpar todos os dados:");
    if (pwd === null) return;
    
    const isAdminValid = internalUsers.some(u => u.role === "Administrador" && u.password === pwd) || pwd === "admin" || pwd === "admin123" || pwd === "comanins123";

    if (isAdminValid) {
      if (confirm("Tem certeza absoluta? Isso apagará TODOS os registros!")) {
        setIsLoading(true);
        try {
          await clearAllFieldServiceRecords();
          alert("Dados limpos com sucesso.");
        } catch (e) {
          console.error(e);
          alert("Erro ao limpar dados.");
        }
        setIsLoading(false);
      }
    } else {
      alert("Senha incorreta! Apenas o Administrador do Sistema possui permissão para excluir registros.");
    }
  };
`;

content = content.replace(oldHandleClearAll.trim(), newHandleClearAll.trim());

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched FieldService with admin passwords successfully.");
