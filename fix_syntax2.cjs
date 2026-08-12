const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const tTarget = `                ? "Configurações do Sistema"
                : activeTab}
            </h2>
          </div>

          <div className="flex items-center space-x-4">`;

const tReplace = `                ? "Configurações do Sistema"
                : activeTab}
            </h2>
          </div>
          </div>

          <div className="flex items-center space-x-4">`;

if (code.includes(tTarget)) {
  code = code.replace(tTarget, tReplace);
} else {
  // Try a slightly different target
  const tTarget2 = `                : activeTab}
            </h2>
          </div>`;
  const tReplace2 = `                : activeTab}
            </h2>
          </div>
          </div>`;
  code = code.replace(tTarget2, tReplace2);
}

fs.writeFileSync('src/components/InternalPortal.tsx', code);
