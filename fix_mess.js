import fs from 'fs';
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

code = code.replace(/selectedIntakeForPhotosToPrint/g, 'selectedIntakeToPrint');
code = code.replace(/setSelectedIntakeForPhotosToPrint/g, 'setSelectedIntakeToPrint');
code = code.replace(/selectedIntakeForPhotosForDevolution/g, 'selectedIntakeForDevolution');
code = code.replace(/setSelectedIntakeForPhotosForDevolution/g, 'setSelectedIntakeForDevolution');
code = code.replace(/selectedIntakeForPhotosForPhotos/g, 'selectedIntakeForPhotos');
code = code.replace(/setSelectedIntakeForPhotosForPhotos/g, 'setSelectedIntakeForPhotos');
code = code.replace(/resetIndividualCollection\(type\)/g, 'resetIndividualCollection(collectionName)');
code = code.replace(/await updateIntakePhotosDoc\(intakeId, \{ photos: newPhotos \}\);/g, 'await updateIntakePhotosDoc(intakeId, newPhotos);');

fs.writeFileSync('src/components/InternalPortal.tsx', code);
