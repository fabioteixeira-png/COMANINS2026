const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `} else if (deleteTarget.type === "intake_photo") {
          const [intakeId, idxStr] = deleteTarget.id.split("::");
          const photoIndex = parseInt(idxStr, 10);
          if (selectedIntakeForPhotos && selectedIntakeForPhotos.id === intakeId) {
            const existingPhotos = selectedIntakeForPhotos.photos || [];
            const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
            await updateIntakePhotosDoc(intakeId, updatedPhotos);
          }
        }`;

const replacement = `} else if (deleteTarget.type === "intake_photo") {
          const [intakeId, idxStr] = deleteTarget.id.split("::");
          const photoIndex = parseInt(idxStr, 10);
          if (selectedIntakeForPhotos && selectedIntakeForPhotos.id === intakeId) {
            const existingPhotos = selectedIntakeForPhotos.photos || [];
            const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
            await updateIntakePhotosDoc(intakeId, updatedPhotos);
            setSavedIntakes((prev) =>
              prev.map((intake) =>
                intake.id === intakeId
                  ? { ...intake, photos: updatedPhotos }
                  : intake,
              ),
            );
            setSelectedIntakeForPhotos((prev) =>
              prev ? { ...prev, photos: updatedPhotos } : null,
            );
          }
        }`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
