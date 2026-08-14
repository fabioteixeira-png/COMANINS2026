const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

// Replace handleAddAsoContractItem
const targetAddAso = `  const handleAddAsoContractItem = async () => {
    if (!newAsoContractName || !newAsoExamDate || !newAsoValidityDate) {
      alert("Por favor, preencha pelo menos o Nome do Contrato, a Data do Exame e a Data de Validade do ASO.");
      return;
    }

    const newAsoItem: AsoContractItem = {
      id: \`aso_\${Date.now()}_\${Math.random().toString(36).substring(2, 6)}\`,
      contractName: newAsoContractName.trim(),
      unitArea: newAsoUnitArea.trim() || 'Unidade Principal',
      examType: newAsoExamType,
      examDate: newAsoExamDate,
      validityDate: newAsoValidityDate,
      status: newAsoStatus,
      clinicDoctor: newAsoClinicDoctor.trim(),
      notes: newAsoNotes.trim(),
      docUrl: ''
    };

    const processAdd = (docUrl: string) => {
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
    };

    if (newAsoDocFile) {
      if (newAsoDocFile.type.startsWith('image/')) {
        try {
          const compressed = await compressImageToWebResolution(newAsoDocFile, 1200, 1200, 0.7);
          processAdd(compressed);
        } catch (err) {
          console.error("Erro ao comprimir imagem:", err);
          alert("Erro ao processar imagem.");
        }
      } else {
        if (newAsoDocFile.size > 500 * 1024) {
          alert("O arquivo do ASO (PDF) é muito grande (" + (newAsoDocFile.size / 1024).toFixed(1) + "KB). O limite é de 500KB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          processAdd((e.target?.result as string) || '');
        };
        reader.readAsDataURL(newAsoDocFile);
      }
    } else {
      processAdd('');
    }
  };`;

const newAddAso = `  const handleAddAsoContractItem = async () => {
    if (!newAsoContractName || !newAsoExamDate || !newAsoValidityDate) {
      alert("Por favor, preencha pelo menos o Nome do Contrato, a Data do Exame e a Data de Validade do ASO.");
      return;
    }
    
    const empId = formData.id || formData.username || selectedUser?.id || selectedUser?.username;
    const empName = formData.name || selectedUser?.name || 'Colaborador';
    
    if (!empId) {
      alert('Por favor, informe a Matrícula/Username na aba 1 (Dados Pessoais) antes de lançar o ASO.');
      return;
    }

    const payload = {
      employeeId: empId,
      employeeName: empName,
      contractName: newAsoContractName.trim(),
      unitArea: newAsoUnitArea.trim() || 'Unidade Principal',
      examType: newAsoExamType,
      examDate: newAsoExamDate,
      validityDate: newAsoValidityDate,
      status: newAsoStatus,
      clinicDoctor: newAsoClinicDoctor.trim(),
      notes: newAsoNotes.trim(),
      docUrl: ''
    };

    const processAdd = async (docUrl) => {
      payload.docUrl = docUrl;
      try {
        await addEmployeeAsoDoc(payload);
        
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
        alert('ASO lançado com sucesso!');
      } catch (err) {
        console.error("Erro ao salvar ASO no banco:", err);
        alert('Ocorreu um erro ao salvar o ASO. Se houver anexo, tente sem ele ou verifique o tamanho do arquivo.');
      }
    };

    if (newAsoDocFile) {
      if (newAsoDocFile.type.startsWith('image/')) {
        try {
          const compressed = await compressImageToWebResolution(newAsoDocFile, 1200, 1200, 0.7);
          processAdd(compressed);
        } catch (err) {
          console.error("Erro ao comprimir imagem:", err);
          alert("Erro ao processar imagem.");
        }
      } else {
        if (newAsoDocFile.size > 500 * 1024) {
          alert("O arquivo do ASO (PDF) é muito grande (" + (newAsoDocFile.size / 1024).toFixed(1) + "KB). O limite é de 500KB.");
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          processAdd((e.target?.result) || '');
        };
        reader.readAsDataURL(newAsoDocFile);
      }
    } else {
      processAdd('');
    }
  };`;

if (code.includes('const handleAddAsoContractItem = async () => {')) {
  // It's safer to use string replacement, but since the target is long and might have formatting diffs,
  // we'll replace the whole function using regex or carefully index matching.
  
  const startIndex = code.indexOf('const handleAddAsoContractItem = async () => {');
  const endIndex = code.indexOf('  const handleRemoveAsoContract =');
  if (startIndex > -1 && endIndex > -1) {
    code = code.slice(0, startIndex) + newAddAso + '\n\n' + code.slice(endIndex);
  }
}

// Replace handleRemoveAsoContract
const newRemoveAso = `  const handleRemoveAsoContract = async (asoId: string) => {
    if (currentUser?.role !== 'Administrador') {
      alert("Apenas administradores podem excluir ASOs.");
      return;
    }
    const pwd = window.prompt("Digite sua senha de administrador para confirmar a exclusão deste ASO:");
    if (pwd === null) return;
    
    const adminUser = internalUsers.find(u => u.username === currentUser?.username);
    if (!adminUser || adminUser.password !== pwd.trim()) {
      alert("Senha incorreta.");
      return;
    }

    try {
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
    } catch (err) {
      console.error("Erro ao remover ASO:", err);
      alert("Erro ao remover ASO.");
    }
  };`;

const startIndexRem = code.indexOf('const handleRemoveAsoContract =');
const endIndexRem = code.indexOf('  // EXPIRATION ALERTS ENGINE');
if (startIndexRem > -1 && endIndexRem > -1) {
  code = code.slice(0, startIndexRem) + newRemoveAso + '\n\n' + code.slice(endIndexRem);
}

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
