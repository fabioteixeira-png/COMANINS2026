const fs = require('fs');
const file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

// replace the first instance inside handleSaveCalibrationBench
// wait, handleSaveCalibrationBench starts around 2990
content = content.replace(
  `  const handleSaveCalibrationBench = async (e: React.FormEvent) => {
    e.preventDefault();
    setBenchSubmitting(true);
    setBenchErrorMessage("");

    // Step 1: Check basic required fields
    if (!selectedInstId) {`,
  `  const handleSaveCalibrationBench = async (e: React.FormEvent) => {
    e.preventDefault();
    setBenchSubmitting(true);
    setBenchErrorMessage("");

    const activeInst = instruments.find(i => i.id === selectedInstId);

    // Step 1: Check basic required fields
    if (!selectedInstId) {`
);

// remove the other definition of activeInst later on in the same function
content = content.replace(
  `        const activeInst = instruments.find(i => i.id === selectedInstId);
        const techName = benchTechnician || startInfo?.technicianName || currentUser?.name || 'Técnico Responsável';`,
  `        const techName = benchTechnician || startInfo?.technicianName || currentUser?.name || 'Técnico Responsável';`
);

fs.writeFileSync(file, content);
console.log("Success");
