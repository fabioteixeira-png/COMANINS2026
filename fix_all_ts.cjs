const fs = require('fs');

let file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8').split('\n');

const errors = [3552, 3572, 4996, 5027, 5159, 8173, 8257, 8668, 9596, 10166, 10583, 11588, 12937];

for (const line of errors) {
  // line is 1-indexed. We want to insert ')}' at the end of line - 1
  // Or line - 2?
  // Let's print out the surrounding lines for each error.
  console.log("Error around line " + line + ":");
  for (let i = line - 3; i < line + 2; i++) {
    console.log(i + 1 + ": " + content[i]);
  }
  console.log("---");
}
