import fs from 'node:fs';
const file = 'src/utils/certificateDomPdf.ts';
let code = fs.readFileSync(file, 'utf8');

const freezeCode = `
const freezeTableGeometry = (root: HTMLElement): void => {
  const tables = root.querySelectorAll("table");
  tables.forEach((table) => {
    const tableRect = table.getBoundingClientRect();
    table.style.setProperty("table-layout", "fixed", "important");
    table.style.setProperty("width", \`\${tableRect.width}px\`, "important");
    table.style.setProperty("max-width", \`\${tableRect.width}px\`, "important");
    table.style.setProperty("border-collapse", "collapse", "important");

    const cells = table.querySelectorAll("th, td");
    cells.forEach((cell) => {
      const rect = cell.getBoundingClientRect();
      const el = cell as HTMLElement;
      el.style.setProperty("width", \`\${rect.width}px\`, "important");
      el.style.setProperty("height", \`\${rect.height}px\`, "important");
      // Fix para evitar que bordas duplas ou padding diminuam o interior:
      el.style.setProperty("box-sizing", "border-box", "important");
    });
  });
};
`;

code = code.replace(
  'type CertificateClone = {',
  freezeCode + '\ntype CertificateClone = {'
);

code = code.replace(
  'inlineHtml2CanvasUnsafeStyles(printSource);',
  'inlineHtml2CanvasUnsafeStyles(printSource);\n    freezeTableGeometry(printSource);'
);

fs.writeFileSync(file, code);
