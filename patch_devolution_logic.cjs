const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

code = code.replace("  updateIntakePhotosDoc,", "  updateIntakePhotosDoc,\n  updateIntakeDevolutionPhoto,");

const handlers = `  const handleOpenDevolutionModal = (intake: any) => {
    setSelectedIntakeForDevolution(intake);
    setShowDevolutionModal(true);
  };

  const handleUploadDevolutionPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedIntakeForDevolution) return;
    try {
      setIsUploadingDevolution(true);
      const file = e.target.files[0];
      const compressed = await compressImage(file, 800, 800, 0.7);
      
      await updateIntakeDevolutionPhoto(selectedIntakeForDevolution.id, compressed);
      
      // Encontrar instrumentos dessa entrada e mudar para Entregue
      const numEntrada = (selectedIntakeForDevolution.numEntrada || "").trim().toLowerCase();
      const matchingInstruments = instruments.filter(
          (i) => (i.numeroDaEntrada || "").trim().toLowerCase() === numEntrada
      );
      
      if (onUpdateInstrumentStatus) {
        for (const inst of matchingInstruments) {
          if (inst.status !== "Entregue") {
            await onUpdateInstrumentStatus(inst.id, "Entregue");
          }
        }
      }

      setSelectedIntakeForDevolution({
        ...selectedIntakeForDevolution,
        photoDevolution: compressed,
      });

      setSavedIntakes((prev) =>
        prev.map((item) =>
          item.id === selectedIntakeForDevolution.id
            ? { ...item, photoDevolution: compressed }
            : item,
        ),
      );
    } catch (err) {
      console.error("Error uploading devolution photo:", err);
    } finally {
      setIsUploadingDevolution(false);
      e.target.value = "";
    }
  };

  const handleDeleteDevolutionPhoto = () => {
    if (selectedIntakeForDevolution) {
      requestAdminDelete("intake_devolution", selectedIntakeForDevolution.id, \`Foto Devolução (Entrada \${selectedIntakeForDevolution.numEntrada})\`);
    }
  };
`;

const insertTarget = `  const handleOpenPhotosModal = (intake: any) => {`;
code = code.replace(insertTarget, handlers + "\n" + insertTarget);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
