const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `const handleDeleteInstrumentPhoto = async () => {
    if (!photoModalInstrument) return;

    // Constraint: completed calibration registration photo cannot be deleted except by admin
    const isConcluded =
      photoModalInstrument.status === "Calibrado" ||
      photoModalInstrument.status === "Aguardando Emissão de Certificado" ||
      photoModalInstrument.status === "Disponível para Retirada" ||
      photoModalInstrument.status === "Entregue" ||
      photoModalInstrument.status === "Não Conforme";
    const isRegPhoto = photoModalType === "registration";
    if (isConcluded && isRegPhoto && !isUserAdmin) {
      alert(
        "Após a conclusão da calibração, a foto de cadastro só pode ser excluída por um administrador.",
      );
      return;
    }

    // Constraint: once inserted, laboratory photo can only be deleted by admin
    const isCalPhoto = photoModalType === "calibrated";
    const alreadyHasCalPhoto = !!photoModalInstrument.photoCalibrated;
    if (isCalPhoto && alreadyHasCalPhoto && !isUserAdmin) {
      alert(
        "Uma vez inserida, a foto após laboratório só pode ser excluída por um administrador.",
      );
      return;
    }

    if (!confirm("Deseja realmente remover esta foto do instrumento?")) return;
    try {
      setIsUploadingInstPhoto(true);
      const fieldToUpdate =
        photoModalType === "registration"
          ? "photoRegistration"
          : "photoCalibrated";

      await updateInstrumentDoc(photoModalInstrument.id, {
        [fieldToUpdate]: "",
      });

      setPhotoModalInstrument((prev) =>
        prev ? { ...prev, [fieldToUpdate]: "" } : null,
      );
    } catch (err) {
      console.error("Error deleting instrument photo:", err);
      alert("Falha ao remover a foto. Tente novamente.");
    } finally {
      setIsUploadingInstPhoto(false);
    }
  };`;

const replacement = `const handleDeleteInstrumentPhoto = async () => {
    if (!photoModalInstrument) return;
    const isRegPhoto = photoModalType === "registration";
    requestAdminDelete(
      isRegPhoto ? "inst_photo_reg" : "inst_photo_calib",
      photoModalInstrument.id,
      \`Foto \${isRegPhoto ? 'de Cadastro' : 'após Laboratório'} do Instrumento \${photoModalInstrument.tag || photoModalInstrument.description}\`
    );
  };`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
