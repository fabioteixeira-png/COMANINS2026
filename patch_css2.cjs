const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

const scrollbarRegex = /\/\* Custom subtle scrollbar styling \*\/(.|\n)*?\/\* Smooth animations and layout styles \*\//m;

const replacement = `/* Custom scrollbar styling */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
::-webkit-scrollbar-track {
  background: #e2e8f0;
}
::-webkit-scrollbar-thumb {
  background: var(--color-royal-blue, #0038a8);
  border-radius: 6px;
  border: 3px solid #e2e8f0;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-royal-dark, #002673);
}

* {
  scrollbar-color: var(--color-royal-blue, #0038a8) #e2e8f0;
  scrollbar-width: thin;
}

/* Secondary scrollbars for nested elements (different tone of blue) */
.overflow-y-auto::-webkit-scrollbar,
.overflow-x-auto::-webkit-scrollbar,
.overflow-auto::-webkit-scrollbar,
.overflow-y-scroll::-webkit-scrollbar,
.overflow-x-scroll::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.overflow-y-auto::-webkit-scrollbar-track,
.overflow-x-auto::-webkit-scrollbar-track,
.overflow-auto::-webkit-scrollbar-track,
.overflow-y-scroll::-webkit-scrollbar-track,
.overflow-x-scroll::-webkit-scrollbar-track {
  background: #f8fafc;
}
.overflow-y-auto::-webkit-scrollbar-thumb,
.overflow-x-auto::-webkit-scrollbar-thumb,
.overflow-auto::-webkit-scrollbar-thumb,
.overflow-y-scroll::-webkit-scrollbar-thumb,
.overflow-x-scroll::-webkit-scrollbar-thumb {
  background: var(--color-royal-light, #2a66f6);
  border: 2px solid #f8fafc;
  border-radius: 5px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover,
.overflow-x-auto::-webkit-scrollbar-thumb:hover,
.overflow-auto::-webkit-scrollbar-thumb:hover,
.overflow-y-scroll::-webkit-scrollbar-thumb:hover,
.overflow-x-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--color-royal-blue, #0038a8);
}

/* Smooth animations and layout styles */`;

content = content.replace(scrollbarRegex, replacement);
fs.writeFileSync('src/index.css', content);
console.log('patched');
