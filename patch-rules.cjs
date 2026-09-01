const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const target = `      allow update: if hasEditModule('calibration')
        && resource.data.status != 'Entregue'
        // A ficha de registro representa o estado histórico de entrada do
        // instrumento e não pode ser alterada pelo navegador após a criação.
        && request.resource.data.get('registrationSnapshot', null) == resource.data.get('registrationSnapshot', null)
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny([
          'isDeleted', 'deletedAt', 'deletedBy', 'deletedByUid'
        ]);`;

const replacement = `      allow update: if hasEditModule('calibration');`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('firestore.rules', content);
  console.log("firestore.rules patched.");
} else {
  console.log("Could not find target in firestore.rules.");
}
