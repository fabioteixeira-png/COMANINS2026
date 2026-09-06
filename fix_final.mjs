import fs from 'node:fs';
const file = 'src/utils/certificateDomPdf.ts';
let code = fs.readFileSync(file, 'utf8');

const freezeLayoutCode = `
const freezeLayoutGeometry = (root: HTMLElement): void => {
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
      el.style.setProperty("min-width", \`\${rect.width}px\`, "important");
      el.style.setProperty("max-width", \`\${rect.width}px\`, "important");
      el.style.setProperty("min-height", \`\${rect.height}px\`, "important");
      el.style.setProperty("max-height", \`\${rect.height}px\`, "important");
      el.style.setProperty("box-sizing", "border-box", "important");
    });
  });

  const structuralBlocks = root.querySelectorAll("div.flex, div.grid, div.w-full");
  structuralBlocks.forEach((block) => {
    const rect = block.getBoundingClientRect();
    const el = block as HTMLElement;
    el.style.setProperty("min-height", \`\${rect.height}px\`, "important");
  });
};
`;

if (!code.includes('const freezeLayoutGeometry')) {
  code = code.replace(
    'type CertificateClone = {',
    freezeLayoutCode + '\ntype CertificateClone = {'
  );
}

fs.writeFileSync(file, code);
