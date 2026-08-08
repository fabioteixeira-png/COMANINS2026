const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `        if (intake) {
          const totalAllowed = (intake.rows || []).reduce(`;

const replacement = `        if (intake) {
          const hasPhotos = intake.photos && intake.photos.length > 0;
          if (!hasPhotos) {
            setInstFormError("Não é permitido utilizar esta entrada pois a foto ainda não foi anexada.");
            return;
          }
          const totalAllowed = (intake.rows || []).reduce(`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/InternalPortal.tsx', content);
  console.log('patched');
} else {
  console.log('target not found');
}
