import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { authJsonFetch } from "./authApi";

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

const readImageAsDataUrl = async (src: string): Promise<string> => {
  if (!src) return "";
  if (src.startsWith("data:")) return src;

  if (src.startsWith("blob:")) {
    const response = await fetch(src);
    if (!response.ok) throw new Error("Não foi possível ler uma imagem temporária do certificado.");
    return blobToDataUrl(await response.blob());
  }

  const absolute = new URL(src, document.baseURI);

  if (absolute.origin === window.location.origin) {
    const response = await fetch(absolute.href, {
      method: "GET",
      cache: "force-cache",
      credentials: "same-origin",
    });
    if (!response.ok) {
      throw new Error(`Não foi possível carregar a imagem local ${absolute.pathname}.`);
    }
    return blobToDataUrl(await response.blob());
  }

  const proxyUrl = `/api/internal/certificate-image-proxy?url=${encodeURIComponent(absolute.href)}`;
  const response = await authJsonFetch(proxyUrl, { method: "GET" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.error === "CERTIFICATE_IMAGE_HOST_NOT_ALLOWED"
        ? "A assinatura utiliza um endereço de imagem não autorizado para o certificado."
        : "Não foi possível incorporar uma imagem externa do certificado.",
    );
  }
  return blobToDataUrl(await response.blob());
};

const inlineCertificateImages = async (root: HTMLElement): Promise<void> => {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  for (const image of images) {
    const src = image.currentSrc || image.getAttribute("src") || image.src;
    if (!src) continue;
    const dataUrl = await readImageAsDataUrl(src);
    if (dataUrl) {
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      image.src = dataUrl;
    }
  }

  await waitForImages(root);
};

const copyComputedStyle = (source: Element, target: Element): void => {
  const computed = window.getComputedStyle(source);
  const targetStyle = (target as HTMLElement | SVGElement).style;
  if (!targetStyle) return;

  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (!property) continue;
    const value = computed.getPropertyValue(property);
    if (!value) continue;
    try {
      targetStyle.setProperty(property, value, computed.getPropertyPriority(property));
    } catch {
      // Some browser-only computed properties are read-only when reapplied.
    }
  }

  targetStyle.setProperty("animation", "none", "important");
  targetStyle.setProperty("transition", "none", "important");
  targetStyle.setProperty("caret-color", "transparent", "important");
};

const freezeCertificateStyles = (source: HTMLElement, clone: HTMLElement): void => {
  const sourceNodes: Element[] = [source, ...Array.from(source.querySelectorAll("*"))];
  const cloneNodes: Element[] = [clone, ...Array.from(clone.querySelectorAll("*"))];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (!cloneNode) return;
    copyComputedStyle(sourceNode, cloneNode);
    cloneNode.removeAttribute("class");
  });
};

type CertificateClone = {
  container: HTMLDivElement;
  clone: HTMLElement;
  width: number;
  height: number;
};

const createFrozenCertificateClone = async (element: HTMLElement): Promise<CertificateClone> => {
  await waitForStableCertificate(element);

  const sourceRect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(sourceRect.width || element.offsetWidth || 816));
  const height = Math.max(1, Math.ceil(element.scrollHeight || sourceRect.height || 1056));

  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('[data-certificate-pdf-ignore="true"]').forEach((node) => node.remove());
  clone.removeAttribute("id");

  const sourceWithoutActions = element.cloneNode(true) as HTMLElement;
  sourceWithoutActions
    .querySelectorAll<HTMLElement>('[data-certificate-pdf-ignore="true"]')
    .forEach((node) => node.remove());

  // Freeze the exact screen-computed layout into inline styles. This makes
  // the PDF capture independent of Google Fonts/CSS imports in Hostinger.
  freezeCertificateStyles(sourceWithoutActions, clone);

  clone.style.setProperty("width", `${width}px`, "important");
  clone.style.setProperty("max-width", `${width}px`, "important");
  clone.style.setProperty("min-width", `${width}px`, "important");
  clone.style.setProperty("margin", "0", "important");
  clone.style.setProperty("transform", "none", "important");
  clone.style.setProperty("box-sizing", "border-box", "important");
  clone.style.setProperty("background", "#ffffff", "important");

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-30000px";
  container.style.top = "0";
  container.style.width = `${width}px`;
  container.style.minWidth = `${width}px`;
  container.style.background = "#ffffff";
  container.style.overflow = "visible";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-2147483647";
  container.appendChild(clone);
  document.body.appendChild(container);

  try {
    await inlineCertificateImages(clone);
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())),
    );
    return { container, clone, width, height: Math.max(height, clone.scrollHeight) };
  } catch (error) {
    container.remove();
    throw error;
  }
};

/**
 * Baixa o mesmo certificado oficial exibido pelo Portal.
 *
 * A REV7 REV3 não usa html-to-image e não clona folhas de estilo externas.
 * O layout computado da tela é congelado em estilos inline e todas as imagens
 * externas (principalmente assinatura do técnico no Firebase Storage) passam
 * por um proxy autenticado e same-origin antes da captura. Assim o canvas não
 * depende de CORS de fontes/imagens no navegador da Hostinger.
 */
export const downloadCertificateDomAsPdf = async (
  element: HTMLElement,
  fileName: string,
): Promise<void> => {
  let prepared: CertificateClone | null = null;

  try {
    prepared = await createFrozenCertificateClone(element);

    const canvas = await html2canvas(prepared.clone, {
      backgroundColor: "#ffffff",
      scale: 1.5,
      useCORS: false,
      allowTaint: false,
      logging: false,
      imageTimeout: 0,
      foreignObjectRendering: false,
      width: prepared.width,
      height: prepared.height,
      windowWidth: prepared.width,
      windowHeight: prepared.height,
      scrollX: 0,
      scrollY: 0,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("A captura do certificado retornou uma imagem vazia.");
    }

    const dataUrl = canvas.toDataURL("image/png", 1);
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
  } catch (error) {
    console.error("Falha ao gerar o certificado PDF no modo same-origin:", error);
    const detail = error instanceof Error ? error.message : String(error || "Erro desconhecido");
    throw new Error(detail);
  } finally {
    prepared?.container.remove();
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
