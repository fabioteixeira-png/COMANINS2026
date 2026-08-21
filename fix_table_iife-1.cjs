const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target2 = `                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Dados Bancários (Confidencial LGPD) */}`;

const replace2 = `                    </div>
                  </div>
                );})()}
              </div>

              {/* Section 5: Dados Bancários (Confidencial LGPD) */}`;

if (code.includes(target2)) {
  code = code.replace(target2, replace2);
  fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
}
