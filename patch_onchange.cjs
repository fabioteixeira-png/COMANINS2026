const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `                      onChange={(e) => {
                        const val = e.target.value;
                        setInstNumeroDaEntrada(val);
                        if (val) {
                          const intake = savedIntakes.find(
                            (s) =>
                              (s.numEntrada || "").trim().toLowerCase() ===
                              val.trim().toLowerCase(),
                          );
                          if (intake) {
                            if (intake.dataEntrada)
                              setInstDataDaEntrada(intake.dataEntrada);
                            if (intake.clientId)
                              setInstClientId(intake.clientId);
                          }
                        } else {
                          setInstDataDaEntrada("");
                          setInstClientId("");
                        }
                      }}`;

const replacement = `                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const intake = savedIntakes.find(
                            (s) =>
                              (s.numEntrada || "").trim().toLowerCase() ===
                              val.trim().toLowerCase(),
                          );
                          if (intake) {
                            const hasPhotos = intake.photos && intake.photos.length > 0;
                            if (!hasPhotos) {
                              alert("É necessário anexar ao menos uma foto na guia de entrada antes de utilizar este número.");
                              return;
                            }
                            setInstNumeroDaEntrada(val);
                            if (intake.dataEntrada)
                              setInstDataDaEntrada(intake.dataEntrada);
                            if (intake.clientId)
                              setInstClientId(intake.clientId);
                          }
                        } else {
                          setInstNumeroDaEntrada("");
                          setInstDataDaEntrada("");
                          setInstClientId("");
                        }
                      }}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/InternalPortal.tsx', content);
  console.log('patched');
} else {
  console.log('target not found');
}
