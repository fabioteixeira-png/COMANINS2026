const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `  const handleUpdateInternalUser = async (id: string, updates: Partial<PortalUser>) => {
    try {
      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      await updatePortalUserDoc(id, cleanUpdates);
    } catch (err) {
      console.error('Error updating internal user in Firestore:', err);
    }
  };`;

const replaceStr = `  const handleUpdateInternalUser = async (id: string, updates: Partial<PortalUser>) => {
    try {
      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      await updatePortalUserDoc(id, cleanUpdates);
    } catch (err: any) {
      console.error('Error updating internal user in Firestore:', err);
      if (err.message && err.message.includes("exceeds the maximum allowed size")) {
         alert("⚠️ ERRO: ARMAZENAMENTO EXCEDIDO!\\n\\nAs alterações não foram salvas porque o tamanho total dos dados (incluindo imagens e PDFs anexados) ultrapassou o limite do banco de dados (1MB). Apague alguns anexos antes de salvar.");
      } else {
         alert("⚠️ Erro ao salvar alterações: " + err.message);
      }
    }
  };`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/App.tsx', code);
