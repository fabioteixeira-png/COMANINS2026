const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

let stack = [];
let htmlStack = [];
for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '{') stack.push('{');
    else if (c === '}') stack.pop();
    else if (c === '(') stack.push('(');
    else if (c === ')') stack.pop();
    else if (c === '[') stack.push('[');
    else if (c === ']') stack.pop();
}

console.log("Brackets remaining:", stack.length);
console.log(stack.join(''));
