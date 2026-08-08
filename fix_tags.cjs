const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// I will just replace the duplicate `</div></div>`
content = content.replace("              </div>\\n              </div>\\n            </div>\\n                        {/* NOVO BLOCO", "              </div>\\n            </div>\\n                        {/* NOVO BLOCO");
fs.writeFileSync('src/components/InternalPortal.tsx', content);
