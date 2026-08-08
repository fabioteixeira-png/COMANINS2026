const fs = require('fs');

// We have the form in form_section.txt from before... wait we dumped it, let's see.
const origForm = fs.readFileSync('form_dump.txt', 'utf-8');
const lines = origForm.split('\n');

