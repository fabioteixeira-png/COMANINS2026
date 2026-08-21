const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

const targetStr = `        await addEmployeeAsoDoc({
          employeeId: empId,
          employeeName: formData.name || selectedUser?.name || 'Desconhecido',
          ...newAsoItem
        });
        
        alert('ASO registrado com sucesso!');

        // Update validity date in formData just for display/logic sync
        setFormData((prev) => {
          const currentList = prev.asoContracts || [];
          const updatedList = [...currentList, newAsoItem];
          updatedList.sort((a, b) => new Date(a.validityDate).getTime() - new Date(b.validityDate).getTime());
          return {
            ...prev,
            asoValidity: updatedList[0]?.validityDate || prev.asoValidity
          };
        });`;

const newStr = `        const savedAso = await addEmployeeAsoDoc({
          employeeId: empId,
          employeeName: formData.name || selectedUser?.name || 'Desconhecido',
          ...newAsoItem
        });
        
        alert('ASO registrado com sucesso!');

        // Update validity date in formData just for display/logic sync
        setFormData((prev) => {
          const currentList = prev.asoContracts || [];
          const updatedList = [...currentList, savedAso];
          updatedList.sort((a, b) => new Date(a.validityDate).getTime() - new Date(b.validityDate).getTime());
          return {
            ...prev,
            asoContracts: updatedList,
            asoValidity: updatedList[0]?.validityDate || prev.asoValidity
          };
        });`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/EmployeeManagement.tsx', content);
console.log("Patched EmployeeManagement.tsx add logic");
