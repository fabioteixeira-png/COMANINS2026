const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target1 = `                                {record.certificateUrl && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (
                                        record.certificateUrl?.startsWith(
                                          "data:",
                                        )
                                      ) {`;

const replacement1 = `                                {record.certificateUrl && (
                                  <>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (
                                        record.certificateUrl?.startsWith(
                                          "data:",
                                        )
                                      ) {`;

code = code.replace(target1, replacement1);

const target2 = `                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                )}`;

const replacement2 = `                                  >
                                    <FileText className="h-4 w-4" />
                                  </button>
                                  <a
                                    href={record.certificateUrl}
                                    download={\`Certificado_\${(user?.name || record.employeeId).replace(/\\s+/g, '_')}\`}
                                    className="p-1 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                    title="Baixar Certificado"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                  </>
                                )}`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
