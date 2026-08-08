const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

content = content.replace("              </div>\\n              </div>\\n            </div>\\n                        {/* NOVO BLOCO", "              </div>\\n            </div>\\n                        {/* NOVO BLOCO");
// Actually, let's just use regex and replace ALL `</div>\n              </div>\n            </div>\n                        {/* NOVO BLOCO`
content = content.replace(/              <\/div>\\n              <\/div>\\n            <\/div>\\n                        \{\/\* NOVO BLOCO/g, "              </div>\\n            </div>\\n                        {/* NOVO BLOCO");
fs.writeFileSync('src/components/InternalPortal.tsx', content);
