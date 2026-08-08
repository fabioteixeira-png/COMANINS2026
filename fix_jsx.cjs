const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

content = content.replace(/\) : \(\s*<div className="space-y-6 print:space-y-4">/g, ') : (<><div className="space-y-6 print:space-y-4">');

content = content.replace(/              <\/div>\s*<\/div>\s*\)\)\}\s*\{activeTab === "certificados" && \(/g, 
`              </div>
            </div>
            </>
          ))}
        {activeTab === "certificados" && (`);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
