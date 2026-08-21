const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

const targetStr = `    try {
      if (asoId.startsWith('easo_')) {
        await deleteEmployeeAsoDoc(asoId);
      } else {
        // Fallback for legacy ASOs stored in formData
        const updatedList = (formData.asoContracts || []).filter((item: any) => item.id !== asoId);
        setFormData((prev: any) => ({
          ...prev,
          asoContracts: updatedList,
          asoValidity: updatedList[0]?.validityDate || ''
        }));
      }
    } catch (err) {`;

const newStr = `    try {
      if (asoId.startsWith('easo_')) {
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

content = content.replace(targetStr, newStr);
fs.writeFileSync('src/components/EmployeeManagement.tsx', content);
console.log("Patched EmployeeManagement.tsx delete logic");
