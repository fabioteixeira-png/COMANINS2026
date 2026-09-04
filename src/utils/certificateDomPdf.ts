import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

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
        window.setTimeout(finish, 2000);
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

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Falha ao converter imagem para DataURL."));
    reader.readAsDataURL(blob);
  });

/**
 * Tenta transformar imagens HTTP(S) do certificado em DataURL dentro do clone
 * isolado. Isso evita que canvas/download dependa de CORS durante a captura.
 * Se uma imagem externa não permitir fetch, mantemos o src original para que
 * o html-to-image ainda possa tentar carregá-la com useCORS.
 */
const inlineCertificateImages = async (root: HTMLElement): Promise<void> => {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  await Promise.all(
    images.map(async (image) => {
      const src = image.currentSrc || image.src;
      if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;

      try {
        const response = await fetch(src, {
          method: "GET",
          mode: "cors",
          cache: "force-cache",
          credentials: "omit",
        });
        if (!response.ok) return;
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (!dataUrl) return;
        image.src = dataUrl;
      } catch (error) {
        console.warn("Não foi possível embutir uma imagem do certificado antes da captura:", src, error);
      }
    }),
  );

  await waitForImages(root);
};

type CertificateFrame = {
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
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
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
};

/**
 * Baixa o mesmo DOM do certificado oficial mostrado no Portal.
 * A captura ocorre em um iframe isolado, com os mesmos estilos do sistema,
 * evitando a dependência do html-to-image (que pode falhar em produção ao
 * processar webfonts/CSS externos). O html-to-image renderiza somente o clone
 * do certificado, nunca a página inteira do Portal.
 */
export const downloadCertificateDomAsPdf = async (
  element: HTMLElement,
  fileName: string,
): Promise<void> => {
  let frame: CertificateFrame | null = null;

  try {
    frame = await createCertificateFrame(element);

    const captureWidth = Math.max(
      1,
      Math.ceil(frame.clone.getBoundingClientRect().width || frame.clone.offsetWidth || 816),
    );
    const captureHeight = Math.max(
      1,
      Math.ceil(frame.clone.scrollHeight || frame.clone.getBoundingClientRect().height || 1056),
    );

    const dataUrl = await toPng(frame.clone, {
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
    }

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
  } catch (error: any) {
    console.error("Falha na captura isolada do certificado:", error);
    let detail = error instanceof Error ? error.message : String(error || "Erro desconhecido");
    if (error && error.type === "error" && error.target) {
       detail = "Erro ao carregar um recurso de imagem ou fonte cross-origin.";
    }
    throw new Error(`${detail}`);
  } finally {
    frame?.container.remove();
  }
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
