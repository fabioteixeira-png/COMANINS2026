const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');

  // I know exactly which ones were broken based on the line numbers:
  // 5163, 9604, 10593
  // Wait, let's just manually fix those lines.
  // Line 5163 is after `<span>Limpar filtros</span>\n                      </button>`
  content = content.replace(
    /<span>Limpar filtros<\/span>\s*<\/button>\s*<\/div>/,
    '<span>Limpar filtros</span>\n                      </button>\n                    )}\n                  </div>'
  );
  
  // Let's check 9604
  content = content.replace(
    /<span>Restaurar Backup<\/span>\s*<\/button>\s*<\/div>/,
    '<span>Restaurar Backup</span>\n                        </button>\n                      )}\n                    </div>'
  );

  // Let's check 10593
  content = content.replace(
    /<span>Limpar Busca<\/span>\s*<\/button>\s*<\/div>/,
    '<span>Limpar Busca</span>\n                      </button>\n                    )}\n                  </div>'
  );

  fs.writeFileSync(file, content);
}

fix('src/components/InternalPortal.tsx');
console.log("Restored conditionals");
