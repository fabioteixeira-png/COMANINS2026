const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// There must be a missing closing tag somewhere between 1865 and 2209.
// The form dump earlier shows a form tag at 1865.
