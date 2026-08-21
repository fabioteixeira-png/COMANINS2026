const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

// There's a `(() => { return asoRecords.length > 0 && (` that needs to end with `); })()}`
// Around line 2005.

const fixTarget = `                            })}
                          </div>
                        </div>
                      )}
                    </div>`;

const fixReplace = `                            })}
                          </div>
                        </div>
                      );})()}
                    </div>`;

if (code.includes('(() => {') && code.includes('asoRecords.length > 0 && (') && !code.includes(';})()')) {
  // we can just replace the very specific block end
  code = code.replace(fixTarget, fixReplace);
  fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
}
