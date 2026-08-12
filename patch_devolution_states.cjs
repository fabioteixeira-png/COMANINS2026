const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `  const [showPhotosModal, setShowPhotosModal] = useState<boolean>(false);`;
const replacement = `  const [showPhotosModal, setShowPhotosModal] = useState<boolean>(false);
  const [showDevolutionModal, setShowDevolutionModal] = useState<boolean>(false);
  const [selectedIntakeForDevolution, setSelectedIntakeForDevolution] = useState<any>(null);
  const [isUploadingDevolution, setIsUploadingDevolution] = useState(false);`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
