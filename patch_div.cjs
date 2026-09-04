const fs = require('fs');
const file = 'src/utils/certificateDomPdf.ts';
let content = fs.readFileSync(file, 'utf8');

const targetFrame = `type CertificateFrame = {
  iframe: HTMLIFrameElement;
  frameWindow: Window;
  frameDocument: Document;
  clone: HTMLElement;
};

const createCertificateFrame = async (element: HTMLElement): Promise<CertificateFrame> => {
  await waitForStableCertificate(element);

  const width = Math.max(
    1,
    Math.ceil(element.getBoundingClientRect().width || element.offsetWidth || 816),
  );
  const height = Math.max(
    1,
    Math.ceil(element.scrollHeight || element.getBoundingClientRect().height || 1056),
  );

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-20000px";
  iframe.style.top = "0";
  iframe.style.width = \`\${width}px\`;
  iframe.style.height = \`\${height}px\`;
  iframe.style.border = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.background = "#ffffff";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error("Não foi possível criar a área isolada do certificado.");
  }

  frameDocument.open();
  frameDocument.write(
    \`<!doctype html><html><head><base href="\${document.baseURI}"></head><body></body></html>\`,
  );
  frameDocument.close();

  document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleNode) => {
    frameDocument.head.appendChild(styleNode.cloneNode(true));
  });

  const isolationStyle = frameDocument.createElement("style");
  isolationStyle.textContent = \`
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: \${width}px !important;
      min-width: \${width}px !important;
      background: #fff !important;
      overflow: visible !important;
    }
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }
  \`;
  frameDocument.head.appendChild(isolationStyle);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('[data-certificate-pdf-ignore="true"]').forEach((node) => node.remove());
  clone.removeAttribute("id");
  frameDocument.body.appendChild(clone);

  await waitForStylesheets(frameDocument);
  await inlineCertificateImages(clone);
  if (frameDocument.fonts?.ready) {
    await frameDocument.fonts.ready;
  }
  await new Promise<void>((resolve) =>
    frameWindow.requestAnimationFrame(() => frameWindow.requestAnimationFrame(() => resolve())),
  );

  return { iframe, frameWindow, frameDocument, clone };
};`;

const replaceFrame = `type CertificateFrame = {
  container: HTMLDivElement;
  clone: HTMLElement;
};

const createCertificateFrame = async (element: HTMLElement): Promise<CertificateFrame> => {
  await waitForStableCertificate(element);

  const width = Math.max(
    1,
    Math.ceil(element.getBoundingClientRect().width || element.offsetWidth || 816),
  );
  const height = Math.max(
    1,
    Math.ceil(element.scrollHeight || element.getBoundingClientRect().height || 1056),
  );

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-20000px";
  container.style.top = "0";
  container.style.width = \`\${width}px\`;
  container.style.height = \`\${height}px\`;
  container.style.background = "#ffffff";
  container.style.overflow = "visible";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('[data-certificate-pdf-ignore="true"]').forEach((node) => node.remove());
  clone.removeAttribute("id");
  container.appendChild(clone);

  await inlineCertificateImages(clone);
  
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())),
  );

  return { container, clone };
};`;

content = content.replace(targetFrame, replaceFrame);

const targetCatch = `} catch (error) {
    console.error("Falha na captura isolada do certificado:", error);
    const detail = error instanceof Error ? error.message : String(error || "Erro desconhecido");
    throw new Error(\`Falha ao capturar o certificado: \${detail}\`);
  } finally {
    frame?.iframe.remove();
  }`;

const replaceCatch = `} catch (error: any) {
    console.error("Falha na captura isolada do certificado:", error);
    let detail = error instanceof Error ? error.message : String(error || "Erro desconhecido");
    if (error && error.type === "error" && error.target) {
       detail = "Erro ao carregar um recurso de imagem ou fonte cross-origin.";
    }
    throw new Error(\`\${detail}\`);
  } finally {
    frame?.container.remove();
  }`;

content = content.replace(targetCatch, replaceCatch);

fs.writeFileSync(file, content);
console.log("Patched successfully!");
