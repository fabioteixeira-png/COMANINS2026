const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `                          <div>
                            <p className="font-bold text-sm uppercase mb-1">
                              4. Condições Ambientais:
                            </p>
                            <div className="pl-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="font-bold text-center">
                                    Temperatura Ambiente
                                  </p>
                                  <p className="text-center">20ºC ± 5ºC</p>
                                </div>
                                <div>
                                  <p className="font-bold text-center">
                                    Umidade Relativa do Ar
                                  </p>
                                  <p className="text-center">50% ± 10%</p>
                                </div>
                              </div>
                            </div>
                          </div>`;

const newStr = `                          <div>
                            <p className="font-bold text-sm uppercase mb-1">
                              4. Condições Ambientais:
                            </p>
                            <div className="pl-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="font-bold text-center">
                                    Temperatura Ambiente
                                  </p>
                                  <p className="text-center">{report?.temperature ? \`\${report.temperature}ºC\` : '20ºC'} (± 5ºC)</p>
                                </div>
                                <div>
                                  <p className="font-bold text-center">
                                    Umidade Relativa do Ar
                                  </p>
                                  <p className="text-center">{report?.humidity ? \`\${report.humidity}%\` : '50%'} (± 20%)</p>
                                </div>
                              </div>
                            </div>
                          </div>`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched condições ambientais");
