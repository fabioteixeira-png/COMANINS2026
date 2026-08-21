const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `const handleDeletePhoto = async (photoIndex: number) => {
    if (!selectedIntakeForPhotos) return;
    if (!confirm("Deseja realmente remover esta foto?")) return;
    try {
      const existingPhotos = selectedIntakeForPhotos.photos || [];
      const updatedPhotos = existingPhotos.filter(
        (_, idx) => idx !== photoIndex,
      );

      await updateIntakePhotosDoc(selectedIntakeForPhotos.id, updatedPhotos);

      // Force local re-render immediately instead of waiting for sync
      setSavedIntakes((prev) =>
        prev.map((intake) =>
          intake.id === selectedIntakeForPhotos.id
            ? { ...intake, photos: updatedPhotos }
            : intake,
        ),
      );
      setSelectedIntakeForPhotos((prev) =>
        prev ? { ...prev, photos: updatedPhotos } : null,
      );
    } catch (err) {
      console.error("Erro ao deletar foto:", err);
      alert("Falha ao remover a foto.");
    }
  };`;

const replacement = `const handleDeletePhoto = async (photoIndex: number) => {
    if (!selectedIntakeForPhotos) return;
    requestAdminDelete(
      "intake_photo",
      \`\${selectedIntakeForPhotos.id}::\${photoIndex}\`,
      \`Foto \${photoIndex + 1} da Entrada\`
    );
  };`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
