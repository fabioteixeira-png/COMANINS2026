const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const targetStr = `  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PortalUser | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<number>(1); // 1 to 7

  // Document attachment local state`;

const replaceStr = `  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PortalUser | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<number>(1); // 1 to 7
  
  // Document attachment local state
  const [userDocuments, setUserDocuments] = useState<EmployeeDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
