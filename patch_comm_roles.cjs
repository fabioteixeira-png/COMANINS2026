const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

const target = `  const isFinanceOrAdmin = currentUser?.role === "Financeiro" || currentUser?.role === "Administrador" || currentUser?.role === "Recursos Humanos (RH)" || currentUser?.role === "Diretoria";`;

const replace = `  const isUserAdmin = currentUser?.permissionLevel === "Administrador" || currentUser?.role === "Administrador" || currentUser?.role === "Admin" || currentUser?.role === "admin" || currentUser?.role === "Diretoria" || currentUser?.role === "master";
  const isFinanceOrAdmin = isUserAdmin || currentUser?.role === "Financeiro" || currentUser?.role === "Recursos Humanos (RH)";`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/InternalCommunication.tsx', code);
