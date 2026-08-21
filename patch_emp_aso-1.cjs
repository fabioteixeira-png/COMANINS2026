const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

// The rendering loops over asoRecords.
// The handleRemoveAsoContract is called with asoItem.id.

const targetStr = `  const handleRemoveAsoContract = async (asoId: string) => {
    if (currentUser?.role !== 'Administrador' && currentUser?.role !== 'Admin' && currentUser?.role !== 'admin' && currentUser?.role !== 'master' && currentUser?.role !== 'Diretor') {
      alert("Apenas administradores podem excluir ASOs.");
      return;
    }
    const pwd = window.prompt("Digite sua senha de administrador para confirmar a exclusão deste ASO:");
    if (pwd === null) return;
    
    let isAdminValid = false;
    const currentUserDoc = internalUsers.find(u => u.username === currentUser?.username);
    if (currentUserDoc && currentUserDoc.password === pwd.trim()) isAdminValid = true;
    
    if (!isAdminValid) {
        const adminUser = internalUsers.find(u => u.role === 'Administrador' && u.password === pwd.trim());
        if (adminUser) isAdminValid = true;
    }
    
    if (!isAdminValid) {
        if (pwd.trim() === '123456' || pwd.trim() === 'admin123' || pwd.trim() === 'admin' || pwd.trim() === 'comanins2026') isAdminValid = true;
    }
    
    if (!isAdminValid) {
      alert("Senha incorreta.");
      return;
    }`;

const newStr = `  const handleRemoveAsoContract = async (asoId: string) => {
    if (currentUser?.role !== 'Administrador' && currentUser?.role !== 'Admin' && currentUser?.role !== 'admin' && currentUser?.role !== 'master' && currentUser?.role !== 'Diretor') {
      alert("Apenas administradores podem excluir ASOs.");
      return;
    }
    const pwd = window.prompt("Digite sua senha de administrador para confirmar a exclusão deste ASO:");
    if (pwd === null) return;
    
    let isAdminValid = false;
    const currentUserDoc = internalUsers.find(u => u.username === currentUser?.username);
    if (currentUserDoc && currentUserDoc.password === pwd.trim()) isAdminValid = true;
    
    if (!isAdminValid) {
        const adminUser = internalUsers.find(u => u.role === 'Administrador' && u.password === pwd.trim());
        if (adminUser) isAdminValid = true;
    }
    
    if (!isAdminValid) {
        if (pwd.trim() === '123456' || pwd.trim() === 'admin123' || pwd.trim() === 'admin' || pwd.trim() === 'comanins2026') isAdminValid = true;
    }
    
    if (!isAdminValid) {
      alert("Senha incorreta.");
      return;
    }`;

// Wait, the ASO deletion uses deleteEmployeeAsoDoc from firebase, BUT maybe it's not refreshing state locally because the parent doesn't trigger a re-render.
// No, the parent has onSnapshot for employeeAsos, so it updates automatically.
// What about the formData? If it's a new ASO that was added to formData but hasn't been saved to firebase yet, it's inside formData.asoContracts.
// If it's saved in firebase, its ID starts with 'easo_' because of addEmployeeAsoDoc.

content = content.replace(targetStr, newStr); // doing nothing

fs.writeFileSync('src/components/EmployeeManagement.tsx', content);
