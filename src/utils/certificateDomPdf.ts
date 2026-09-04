import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

const waitForImages = async (root: Document | HTMLElement): Promise<void> => {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    }),
  );
};


const waitForStylesheets = async (root: Document): Promise<void> => {
  const links = Array.from(root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  await Promise.all(
    links.map((link) => {
      if (link.sheet) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        link.addEventListener("load", finish, { once: true });
        link.addEventListener("error", finish, { once: true });
        window.setTimeout(finish, 1500);
      });
    }),
  );
};

const waitForStableCertificate = async (element: HTMLElement): Promise<void> => {
  await waitForImages(element);
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())),
  );
};

/**
 * Baixa exatamente o mesmo DOM do certificado oficial mostrado no Portal.
 * Não recria o certificado, não altera largura/padding/min-height e não aplica
 * uma segunda formatação para o Serviço de Campo.
 */
export const downloadCertificateDomAsPdf = async (
  element: HTMLElement,
  fileName: string,
): Promise<void> => {
  await waitForStableCertificate(element);

  const width = Math.ceil(element.getBoundingClientRect().width || element.offsetWidth || 816);
  const height = Math.ceil(element.scrollHeight || element.getBoundingClientRect().height || 1056);

  const dataUrl = await toPng(element, {
    cacheBust: true,
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    width,
    height,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return node.dataset.certificatePdfIgnore !== "true";
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const image = pdf.getImageProperties(dataUrl);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const scale = Math.min(pageWidth / image.width, pageHeight / image.height);
  const renderWidth = image.width * scale;
  const renderHeight = image.height * scale;
  const x = (pageWidth - renderWidth) / 2;
  const y = (pageHeight - renderHeight) / 2;

  pdf.addImage(dataUrl, "PNG", x, y, renderWidth, renderHeight, undefined, "FAST");
  pdf.save(fileName);
};

/**
 * Imprime somente o certificado oficial em um iframe temporário. O iframe
 * recebe os mesmos estilos carregados pelo Portal, mas nenhum cabeçalho,
 * sidebar, barra fixa ou outro elemento do sistema é copiado para a impressão.
 */
export const printCertificateDomOnly = async (element: HTMLElement): Promise<void> => {
  await waitForStableCertificate(element);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 250);
  };

  try {
    const frameWindow = iframe.contentWindow;
    const frameDocument = iframe.contentDocument;
    if (!frameWindow || !frameDocument) {
      throw new Error("Não foi possível criar a área isolada de impressão.");
    }

    frameDocument.open();
    frameDocument.write("<!doctype html><html><head></head><body></body></html>");
    frameDocument.close();

    document.querySelectorAll('link[rel="stylesheet"], style').forEach((styleNode) => {
      frameDocument.head.appendChild(styleNode.cloneNode(true));
    });

    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll<HTMLElement>('[data-certificate-pdf-ignore="true"]').forEach((node) => node.remove());
    clone.removeAttribute("id");
    frameDocument.body.appendChild(clone);

    const isolationStyle = frameDocument.createElement("style");
    isolationStyle.textContent = `
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      body { overflow: visible !important; }
      @media print {
        html, body { width: auto !important; height: auto !important; overflow: visible !important; }
      }
    `;
    frameDocument.head.appendChild(isolationStyle);

    await waitForStylesheets(frameDocument);
    await waitForImages(frameDocument);
    if (frameDocument.fonts?.ready) {
      await frameDocument.fonts.ready;
    }
    await new Promise<void>((resolve) =>
      frameWindow.requestAnimationFrame(() => frameWindow.requestAnimationFrame(() => resolve())),
    );

    frameWindow.addEventListener("afterprint", cleanup, { once: true });
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(cleanup, 4000);
  } catch (error) {
    iframe.remove();
    throw error;
  }
};
