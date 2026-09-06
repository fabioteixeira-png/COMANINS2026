import fs from 'node:fs';
const file = 'src/utils/certificateDomPdf.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'export const printCertificateDomOnly = async (element: HTMLElement): Promise<void> => {',
  'export const printCertificateDomOnly = async (element: HTMLElement, documentTitle?: string): Promise<void> => {'
);

code = code.replace(
  'frameDocument.write("<!doctype html><html><head></head><body></body></html>");',
  'const titleHtml = documentTitle ? `<title>\${documentTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>` : "<title>Certificado de Calibração</title>";\n    frameDocument.write(`<!doctype html><html><head>\${titleHtml}</head><body></body></html>`);'
);

fs.writeFileSync(file, code);
