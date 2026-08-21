const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const targetStrEdit = `  // Open Edit Modal
  const handleOpenEdit = (user: PortalUser) => {
    setSelectedUser(user);
    setFormData({ ...user });
    setActiveFormTab(1);
    setShowEditModal(true);
  };`;

const replaceStrEdit = `  // Open Edit Modal
  const handleOpenEdit = async (user: PortalUser) => {
    setSelectedUser(user);
    setFormData({ ...user });
    setActiveFormTab(1);
    
    setIsLoadingDocs(true);
    const docs = await getEmployeeDocuments(user.id);
    setUserDocuments(docs);
    setIsLoadingDocs(false);
    
    setShowEditModal(true);
  };`;

const targetStrView = `  // Open Full Ficha Modal (View)
  const handleOpenView = (user: PortalUser) => {
    setSelectedUser(user);
    
    // Append view audit log entry`;

const replaceStrView = `  // Open Full Ficha Modal (View)
  const handleOpenView = async (user: PortalUser) => {
    setSelectedUser(user);
    
    setIsLoadingDocs(true);
    const docs = await getEmployeeDocuments(user.id);
    setUserDocuments(docs);
    setIsLoadingDocs(false);

    // Append view audit log entry`;

code = code.replace(targetStrEdit, replaceStrEdit).replace(targetStrView, replaceStrView);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
