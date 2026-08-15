const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `import React, { Component, useState, useEffect } from 'react';`;
const replace1 = `import React, { Component, useState, useEffect } from 'react';
import { deleteField } from 'firebase/firestore';`;

code = code.replace(target1, replace1);
fs.writeFileSync('src/App.tsx', code);
