import fs from 'fs';
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const regex = /const handleConfirmAdminDelete = async \(e: React\.FormEvent\) => \{[\s\S]*?if \(\s*\!window\.confirm\(/;

const missingCode = `
  const handleConfirmAdminDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError("");
    const typedPassword = adminPasswordInput.trim();

    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser?.username, password: typedPassword })
    });
    const data = await res.json();
    
    if (!data.valid) {
      setAdminPasswordError("Senha incorreta! Apenas o Administrador do Sistema possui permissão para excluir registros.");
      return;
    }

    try {
      if (deleteTarget) {
        if (deleteTarget.type === "instrument") {
          await onDeleteInstrument(deleteTarget.id);
        } else if (deleteTarget.type === "report") {
          if (onDeleteReport) await onDeleteReport(deleteTarget.id);
        } else if (deleteTarget.type === "client") {
          if (onDeleteClient) await onDeleteClient(deleteTarget.id);
        } else if (deleteTarget.type === "user") {
          if (onDeleteInternalUser) await onDeleteInternalUser(deleteTarget.id);
        } else if (deleteTarget.type === "standard") {
          await deleteStandardDoc(deleteTarget.id);
        } else if (deleteTarget.type === "birthday") {
          await deleteEmployeeBirthdayDoc(deleteTarget.id);
        } else if (deleteTarget.type === "intake") {
          await deleteIntakeDoc(deleteTarget.id);
          setShowIntakeList(false);
        } else if (deleteTarget.type === "inventory") {
          await deleteInventoryItemDoc(deleteTarget.id);
        } else if (deleteTarget.type === "training") {
          await deleteTrainingDoc(deleteTarget.id);
        } else if (deleteTarget.type === "employee_training") {
          await deleteEmployeeTrainingDoc(deleteTarget.id);
        } else if (deleteTarget.type === "employee_aso") {
          const { deleteEmployeeAsoDoc } = await import('../lib/firebase');
          await deleteEmployeeAsoDoc(deleteTarget.id);
        } else if (deleteTarget.type === "audit_log") {
          await deleteAccessAuditLogDoc(deleteTarget.id);
        } else if (deleteTarget.type === "payslip") {
          await deletePayslipDoc(deleteTarget.id);
          setPayslips(prev => prev.filter(r => r.id !== deleteTarget.id));
        } else if (deleteTarget.type === "exam") {
          await deleteMedicalExamDoc(deleteTarget.id);
        } else if (deleteTarget.type === "exam_type") {
          const newCatalog = examTypesCatalog.filter(r => r.id !== deleteTarget.id);
          await updateExamTypesCatalogConfig(newCatalog);
        } else if (deleteTarget.type === "intake_photo") {
          const [intakeId, indexStr] = deleteTarget.id.split("::");
          const index = parseInt(indexStr, 10);
          if (selectedIntake && selectedIntake.id === intakeId) {
            const newPhotos = (selectedIntake.photos || []).filter((_: any, i: number) => i !== index);
            await updateIntakeDoc(intakeId, { photos: newPhotos });
            setSavedIntakes(prev => prev.map(item => item.id === intakeId ? { ...item, photos: newPhotos } : item));
            setSelectedIntake(prev => prev ? { ...prev, photos: newPhotos } : null);
          }
        } else if (deleteTarget.type === "inst_photo_reg") {
          await updateInstrumentDoc(deleteTarget.id, { photoRegistration: "" });
          setInstruments(prev => prev.map(inst => inst.id === deleteTarget.id ? { ...inst, photoRegistration: "" } : inst));
        } else if (deleteTarget.type === "inst_photo_calib") {
          await updateInstrumentDoc(deleteTarget.id, { photoCalibrated: "" });
          setInstruments(prev => prev.map(inst => inst.id === deleteTarget.id ? { ...inst, photoCalibrated: "" } : inst));
        } else if (deleteTarget.type === "finance_transaction") {
          const fb = await import('../lib/firebase');
          await fb.deleteFinanceTransaction(deleteTarget.id);
        } else if (deleteTarget.type === "finance_contract") {
          const fb = await import('../lib/firebase');
          await fb.deleteFinanceContract(deleteTarget.id);
        } else if (deleteTarget.type === "finance_measurement") {
          const fb = await import('../lib/firebase');
          await fb.deleteFinanceMeasurement(deleteTarget.id);
        } else if (deleteTarget.type === "finance_bank") {
          const fb = await import('../lib/firebase');
          await fb.deleteFinanceDoc('financeBankAccounts', deleteTarget.id);
        } else if (deleteTarget.type === "finance_category") {
          const fb = await import('../lib/firebase');
          await fb.deleteFinanceDoc('financeCategories', deleteTarget.id);
        } else if (deleteTarget.type === "intake_devolution") {
          await updateIntakeDoc(deleteTarget.id, { photoDevolution: "" });
          setSelectedIntake(prev => prev && prev.id === deleteTarget.id ? { ...prev, photoDevolution: "" } : prev);
          setSavedIntakes(prev => prev.map(i => i.id === deleteTarget.id ? { ...i, photoDevolution: "" } : i));
        }
      }
      setShowAdminDeleteModal(false);
      setDeleteTarget({ type: "client", id: "", name: "" } as any);
      alert("✓ Registro excluído com sucesso pelo Administrador do Sistema.");
    } catch (err: any) {
      setAdminPasswordError("Erro ao efetuar exclusão: " + (err.message || err.toString()));
    }
  };

  const handleResetDatabase = async () => {
    setMaintenanceError("");
    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser?.username, password: maintenancePassword })
    });
    const data = await res.json();
    if (!data.valid) {
      setMaintenanceError("Senha incorreta! Apenas administradores autorizados possuem permissão para limpar o banco de dados.");
      return;
    }

    if (window.confirm("ATENÇÃO: Você tem certeza que deseja EXCLUIR TODO O BANCO DE DADOS e restaurar as configurações originais? Esta ação é irreversível.")) {
      setIsResetting(true);
      try {
        await clearAndResetDatabase();
        alert("✓ Banco de dados redefinido com sucesso para os valores padrões!");
        setMaintenancePassword("");
      } catch (err: any) {
        console.error("Error resetting database:", err);
        setMaintenanceError("Falha ao redefinir banco de dados: " + (err.message || err.toString()));
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleResetIndividual = async (collectionName: string, name: string) => {
    setMaintenanceError("");
    const promptPassword = window.prompt(\`Para confirmar a exclusão e redefinição do módulo "\${name}", digite a senha de administrador:\`);
    if (promptPassword === null) return;
    const typedPassword = promptPassword.trim();
    if (!typedPassword) {
      alert("A senha do administrador é obrigatória.");
      return;
    }
    
    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser?.username, password: typedPassword })
    });
    const data = await res.json();
    if (!data.valid) {
      alert("Senha incorreta! Apenas administradores autorizados possuem permissão para limpar o banco de dados.");
      return;
    }

    if (
      !window.confirm(
`;

code = code.replace(regex, missingCode.trim() + "\n    if (\n      !window.confirm(");
fs.writeFileSync('src/components/InternalPortal.tsx', code);
console.log("InternalPortal disaster fixed");
