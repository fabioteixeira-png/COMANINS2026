const fs = require('fs');
const file = 'src/utils/certificateDomPdf.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('import html2canvas from "html2canvas";', 'import { toPng } from "html-to-image";');
content = content.replace('O html2canvas renderiza somente o clone', 'O html-to-image renderiza somente o clone');

const targetCanvas = `const canvas = await html2canvas(frame.clone, {
      backgroundColor: "#ffffff",
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 15000,
      removeContainer: true,
      foreignObjectRendering: false,
      width: captureWidth,
      height: captureHeight,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("A captura do certificado retornou uma imagem vazia.");
    }

    const dataUrl = canvas.toDataURL("image/png", 1);
    if (!dataUrl || dataUrl === "data:,") {
      throw new Error("A captura do certificado não gerou uma imagem válida.");
    }`;

const replaceCanvas = `const dataUrl = await toPng(frame.clone, {
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio: 1.5,
      width: captureWidth,
      height: captureHeight,
      style: {
        transform: 'none',
        margin: '0',
      },
    });

    if (!dataUrl || dataUrl === "data:,") {
      throw new Error("A captura do certificado não gerou uma imagem válida.");
    }`;

content = content.replace(targetCanvas, replaceCanvas);
fs.writeFileSync(file, content);
console.log("Patched successfully!");
