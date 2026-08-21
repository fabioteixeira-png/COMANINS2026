const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

const targetStr = `    try {
      // Execute the database delete unconditionally since 'easo_' constraint causes bugs for old migrated records
      if (asoId) {
         await deleteEmployeeAsoDoc(asoId);
      }
      // Always remove from local formData as well, whether it's legacy or newly added to local state
      const updatedList = (formData.asoContracts || []).filter((item: any) => item.id !== asoId);
      setFormData((prev: any) => ({
        ...prev,
        asoContracts: updatedList,
        asoValidity: updatedList.length > 0 ? (updatedList[0]?.validityDate || '') : ''
      }));
    } catch (err) {`;

const newStr = `    try {
      // Execute the database delete unconditionally since 'easo_' constraint causes bugs for old migrated records
      if (asoId) {
         await deleteEmployeeAsoDoc(asoId);
      }
      // Always remove from local formData as well, whether it's legacy or newly added to local state
      const updatedList = (formData.asoContracts || []).filter((item: any) => item.id !== asoId);
      
      // Se for um ASO legado salvo diretamente no cadastro do colaborador (não no employeeAsos), precisamos forçar a atualização no Firebase imediatamente.
      if (asoId && !asoId.startsWith('easo_') && selectedUser && onUpdateInternalUser) {
        onUpdateInternalUser(selectedUser.id, { asoContracts: updatedList });
      }

      setFormData((prev: any) => ({
        ...prev,
        asoContracts: updatedList,
        asoValidity: updatedList.length > 0 ? (updatedList[0]?.validityDate || '') : ''
      }));
    } catch (err) {`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('src/components/EmployeeManagement.tsx', content);
console.log("Patched handleRemoveAsoContract with legacy update");
