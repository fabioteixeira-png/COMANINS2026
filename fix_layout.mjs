import fs from 'node:fs';
const file = 'src/utils/certificateDomPdf.ts';
let code = fs.readFileSync(file, 'utf8');

const freezeLayoutCode = `
const freezeLayoutGeometry = (root: HTMLElement): void => {
  // Fix specifically the elements that cause layout drift in html2canvas:
  // 1. Tables (fix width, height, table-layout)
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
      el.style.setProperty("box-sizing", "border-box", "important");
    });
  });

  // 2. Fix the height of major structural blocks (signatures, indicators)
  // to avoid vertical displacement
  const structuralBlocks = root.querySelectorAll("div.flex, div.grid");
  structuralBlocks.forEach((block) => {
    const rect = block.getBoundingClientRect();
    const el = block as HTMLElement;
    el.style.setProperty("min-height", \`\${rect.height}px\`, "important");
  });
};
`;

code = code.replace(
  'const freezeTableGeometry = (root: HTMLElement): void => {',
  '// REMOVED'
);
// we will just replace the whole old freezeTableGeometry logic
code = code.replace(
  /const freezeTableGeometry[\s\S]*?type CertificateClone/m,
  freezeLayoutCode + '\ntype CertificateClone'
);

code = code.replace(
  'freezeTableGeometry(printSource);',
  'freezeLayoutGeometry(printSource);'
);

fs.writeFileSync(file, code);
