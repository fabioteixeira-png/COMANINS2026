const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `                        const isFull =
                          registeredCount >= totalAllowed && totalAllowed > 0;
                        return (
                          <option key={intake.id} value={intake.numEntrada}>
                            {intake.numEntrada} ({registeredCount}/
                            {totalAllowed} reg.){isFull ? " - ESGOTADO" : ""}
                          </option>
                        );`;

const replacement = `                        const isFull =
                          registeredCount >= totalAllowed && totalAllowed > 0;
                        const hasPhotos = intake.photos && intake.photos.length > 0;
                        
                        let label = \`\${intake.numEntrada} (\${registeredCount}/\${totalAllowed} reg.)\`;
                        if (isFull) label += " - ESGOTADO";
                        else if (!hasPhotos) label += " - FOTO PENDENTE";

                        return (
                          <option 
                            key={intake.id} 
                            value={intake.numEntrada}
                            disabled={isFull || !hasPhotos}
                          >
                            {label}
                          </option>
                        );`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/InternalPortal.tsx', content);
  console.log('patched');
} else {
  console.log('target not found');
}
