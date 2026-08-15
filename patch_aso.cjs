const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target = `    const processAdd = (docUrl: string) => {
      newAsoItem.docUrl = docUrl;
      const currentList = formData.asoContracts || [];
      const updatedList = [...currentList, newAsoItem];
      updatedList.sort((a, b) => new Date(a.validityDate).getTime() - new Date(b.validityDate).getTime());

      setFormData((prev) => ({
        ...prev,
        asoContracts: updatedList,
        asoValidity: updatedList[0]?.validityDate || prev.asoValidity
      }));

      // Reset sub-form
      setNewAsoContractName('');
      setNewAsoUnitArea('');
      setNewAsoExamType('Periódico');
      setNewAsoExamDate('');
      setNewAsoValidityDate('');
      setNewAsoStatus('Apto');
      setNewAsoClinicDoctor('');
      setNewAsoNotes('');
      setNewAsoDocFile(null);
    };`;

const replace = `    const processAdd = async (docUrl: string) => {
      newAsoItem.docUrl = docUrl;
      
      const empId = selectedUser?.id || formData.id || formData.username;
      if (!empId) {
        alert('Por favor, primeiro salve o colaborador usando o botão "Salvar Alterações" no final da página (Aba 1) antes de registrar um ASO.');
        return;
      }
      
      try {
        await addEmployeeAsoDoc({
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
        });

        // Reset sub-form
        setNewAsoContractName('');
        setNewAsoUnitArea('');
        setNewAsoExamType('Periódico');
        setNewAsoExamDate('');
        setNewAsoValidityDate('');
        setNewAsoStatus('Apto');
        setNewAsoClinicDoctor('');
        setNewAsoNotes('');
        setNewAsoDocFile(null);
      } catch (err) {
        alert('Erro ao salvar ASO: ' + err);
      }
    };`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
