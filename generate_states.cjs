const fs = require('fs');

const vars = fs.readFileSync('missing_vars.txt', 'utf-8').trim().split('\n');
const getters = new Set();
const setters = new Set();
const others = new Set();

vars.forEach(v => {
  if (v.startsWith('set') && v.length > 3 && v[3] === v[3].toUpperCase()) {
    setters.add(v);
  } else {
    getters.add(v);
  }
});

let code = '';
const processedGetters = new Set();

setters.forEach(s => {
  const getterName = s.charAt(3).toLowerCase() + s.slice(4);
  let init = '""';
  if (getterName.startsWith('show') || getterName.startsWith('is')) init = 'false';
  if (getterName.endsWith('s') || getterName.endsWith('List')) init = '[]';
  
  if (getters.has(getterName)) {
    code += `  const [${getterName}, ${s}] = useState<any>(${init});\n`;
    processedGetters.add(getterName);
  } else {
    code += `  const [${getterName}, ${s}] = useState<any>(${init});\n`;
  }
});

getters.forEach(g => {
  if (!processedGetters.has(g)) {
    if (g.startsWith('handle') || g.startsWith('on') || g === 'getIntakeSummary' || g === 'triggerQuickPrompt') {
      code += `  const ${g} = (e?: any) => {};\n`;
    } else {
      if (g === 'countPending' || g === 'countCompleted') {
        code += `  const ${g} = 0;\n`;
      } else if (g === 'dashboardNotifications') {
        code += `  const dashboardNotifications: any[] = [];\n`;
      } else if (g === 'computedEmployeeTrainings') {
        code += `  const computedEmployeeTrainings: any[] = [];\n`;
      } else if (g === 'dropdownOptions') {
        code += `  const dropdownOptions = DEFAULT_DROPDOWN_OPTIONS;\n`;
      } else {
        code += `  const ${g}: any = null;\n`;
      }
    }
  }
});

fs.writeFileSync('generated_states.txt', code);
