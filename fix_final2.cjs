const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// I saw these syntax errors:
// src/components/InternalPortal.tsx(1865,20): error TS17008: JSX element 'form' has no corresponding closing tag.
// src/components/InternalPortal.tsx(2051,21): error TS1005: ')' expected.
// ...

// The actual form is valid, what is the file actually compiling down to?
// Oh wait, maybe `{(dropdownOptions.descricao || []).map` was somehow messed up
// let's check current line 1890-1910
