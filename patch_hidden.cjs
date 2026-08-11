const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// The lines have: hidden={!isUserAdmin}
// Usually on delete buttons. We will remove it if it is near a delete action.
// To be safe, let's remove it from ALL buttons that also have onClick={.*Delete.*|.*requestAdminDelete.*}
// Actually, it's easier to just find them and remove them.
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('hidden={!isUserAdmin}')) {
    // Check if nearby lines contain delete or excluir or Trash2
    let isDelete = false;
    for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 10); j++) {
      if (lines[j].match(/delete|excluir|Trash2|requestAdminDelete|handleDelete/i)) {
        isDelete = true;
        break;
      }
    }
    if (isDelete) {
      lines[i] = lines[i].replace(/hidden=\{!isUserAdmin\}/, '');
    }
  }
}

fs.writeFileSync('src/components/InternalPortal.tsx', lines.join('\n'));
