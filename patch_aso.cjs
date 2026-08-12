const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target1 = `  const handleAddAsoContract = () => {
    if (!newAsoContractName.trim()) {
      alert('Por favor, informe o Nome do Contrato ou Cliente.');
      return;
    }
    if (!newAsoValidityDate) {
      alert('Por favor, informe a Data de Validade do ASO.');
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
      const reader = new FileReader();
      reader.onload = (e) => {
        processAdd((e.target?.result as string) || '');
      };
      reader.readAsDataURL(newAsoDocFile);
    } else {
      processAdd('');
    }
  };

  const handleRemoveAsoContract = (asoId: string) => {
    const updatedList = (formData.asoContracts || []).filter((item) => item.id !== asoId);
    setFormData((prev) => ({
      ...prev,
      asoContracts: updatedList,
      asoValidity: updatedList[0]?.validityDate || ''
    }));
  };`;

const replacement1 = `  const handleAddAsoContract = async () => {
    if (!newAsoContractName.trim()) {
      alert('Por favor, informe o Nome do Contrato ou Cliente.');
      return;
    }
    if (!newAsoValidityDate) {
      alert('Por favor, informe a Data de Validade do ASO.');
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
  };

  const handleRemoveAsoContract = (asoId: string) => {
    if (currentUser?.role !== 'Administrador') {
      alert("Apenas administradores podem excluir ASOs.");
      return;
    }
    const pwd = window.prompt("Digite sua senha de administrador para confirmar a exclusão deste ASO:");
    if (pwd === null) return;
    
    const adminUser = internalUsers.find(u => u.username === currentUser.username);
    if (!adminUser || adminUser.password !== pwd.trim()) {
      alert("Senha incorreta.");
      return;
    }

    const updatedList = (formData.asoContracts || []).filter((item) => item.id !== asoId);
    setFormData((prev) => ({
      ...prev,
      asoContracts: updatedList,
      asoValidity: updatedList[0]?.validityDate || ''
    }));
  };`;

code = code.replace(target1, replacement1);

const target2 = `                                      {asoItem.docUrl && (
                                        <a
                                          href={asoItem.docUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 text-royal-blue hover:bg-blue-50 rounded transition-colors"
                                          title="Visualizar Anexo ASO"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </a>
                                      )}`;

const replacement2 = `                                      {asoItem.docUrl && (
                                        <div className="flex items-center space-x-1">
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              if (asoItem.docUrl?.startsWith("data:")) {
                                                try {
                                                  const byteString = atob(asoItem.docUrl.split(",")[1]);
                                                  const mimeString = asoItem.docUrl.split(",")[0].split(":")[1].split(";")[0];
                                                  const ab = new ArrayBuffer(byteString.length);
                                                  const ia = new Uint8Array(ab);
                                                  for (let i = 0; i < byteString.length; i++) {
                                                    ia[i] = byteString.charCodeAt(i);
                                                  }
                                                  const blob = new Blob([ab], { type: mimeString });
                                                  const blobUrl = URL.createObjectURL(blob);
                                                  window.open(blobUrl, "_blank");
                                                } catch (err) {
                                                  console.error("Erro ao abrir ASO", err);
                                                  alert("Erro ao abrir o ASO.");
                                                }
                                              } else {
                                                window.open(asoItem.docUrl, "_blank");
                                              }
                                            }}
                                            className="p-1 text-royal-blue hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                            title="Visualizar Anexo ASO"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                          <a
                                            href={asoItem.docUrl}
                                            download={\`ASO_\${(formData.name || 'Colaborador').replace(/\\s+/g, '_')}_\${asoItem.validityDate}\`}
                                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                            title="Baixar ASO"
                                          >
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </div>
                                      )}`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
