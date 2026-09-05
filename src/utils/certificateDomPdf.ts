import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { authJsonFetch } from "./authApi";

const CERTIFICATE_CAPTURE_SCALE = 1.5;
const IMAGE_WAIT_TIMEOUT_MS = 8000;
const PDF_PAGE_MARGIN_MM = 10;

const waitForImages = async (root: Document | HTMLElement): Promise<void> => {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return typeof image.decode === "function" ? image.decode().catch(() => undefined) : Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        let timeoutId = 0;
        const finish = () => {
          image.removeEventListener("load", finish);
          image.removeEventListener("error", finish);
          window.clearTimeout(timeoutId);
          resolve();
        };
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        timeoutId = window.setTimeout(finish, IMAGE_WAIT_TIMEOUT_MS);
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

const assertImageResponse = (response: Response, description: string): void => {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!response.ok) {
    throw new Error(`${description}: resposta HTTP ${response.status}.`);
  }
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error(`${description}: o servidor retornou ${contentType} em vez de uma imagem.`);
  }
};

const readImageAsDataUrl = async (src: string): Promise<string> => {
  if (!src) return "";
  if (src.startsWith("data:")) return src;

  if (src.startsWith("blob:")) {
    const response = await fetch(src);
    assertImageResponse(response, "Não foi possível ler uma imagem temporária do certificado");
    return blobToDataUrl(await response.blob());
  }

  const absolute = new URL(src, document.baseURI);

  if (absolute.origin === window.location.origin) {
    const response = await fetch(absolute.href, {
      method: "GET",
      cache: "force-cache",
      credentials: "same-origin",
    });
    assertImageResponse(response, `Não foi possível carregar a imagem local ${absolute.pathname}`);
    return blobToDataUrl(await response.blob());
  }

  const proxyUrl = `/api/internal/certificate-image-proxy?url=${encodeURIComponent(absolute.href)}`;
  const response = await authJsonFetch(proxyUrl, { method: "GET" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.error === "CERTIFICATE_IMAGE_HOST_NOT_ALLOWED"
        ? "A assinatura utiliza um endereço de imagem não autorizado para o certificado."
        : `Não foi possível incorporar uma imagem externa do certificado (${payload?.error || response.status}).`,
    );
  }
  assertImageResponse(response, "Não foi possível incorporar uma imagem externa do certificado");
  return blobToDataUrl(await response.blob());
};

const inlineCertificateImages = async (root: HTMLElement): Promise<void> => {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  for (const image of images) {
    const src = image.currentSrc || image.getAttribute("src") || image.src;
    if (!src) continue;
    try {
      const dataUrl = await readImageAsDataUrl(src);
      if (dataUrl) {
        image.removeAttribute("srcset");
        image.removeAttribute("sizes");
        image.crossOrigin = "anonymous";
        image.src = dataUrl;
        if (typeof image.decode === "function") await image.decode();
      }
    } catch (error) {
      const description = image.getAttribute("alt") || "imagem sem identificação";
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao preparar “${description}” para o PDF. ${detail}`);
    }
  }

  await waitForImages(root);
};

const MODERN_CSS_COLOR_FUNCTION_PATTERN = /\b(?:oklch|oklab|lab|lch|color)\([^()]*\)/gi;
const convertedCssColorCache = new Map<string, string>();
let colorConversionContext: CanvasRenderingContext2D | null | undefined;

const getColorConversionContext = (): CanvasRenderingContext2D => {
  if (colorConversionContext === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    colorConversionContext = canvas.getContext("2d", { willReadFrequently: true });
  }

  if (!colorConversionContext) {
    throw new Error("O navegador não disponibilizou a conversão de cores para o certificado.");
  }
  return colorConversionContext;
};

const convertModernCssColorToRgba = (color: string): string => {
  const cached = convertedCssColorCache.get(color);
  if (cached) return cached;

  const context = getColorConversionContext();
  const accepted = ["#010203", "#fefdfc"].some((sentinel) => {
    context.fillStyle = sentinel;
    const marker = context.fillStyle;
    context.fillStyle = color;
    return context.fillStyle !== marker;
  });

  if (!accepted) {
    throw new Error(`Não foi possível converter a cor moderna “${color}” do certificado.`);
  }

  context.clearRect(0, 0, 1, 1);
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alphaByte] = context.getImageData(0, 0, 1, 1).data;
  const alpha = Number((alphaByte / 255).toFixed(4));
  const rgba = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  convertedCssColorCache.set(color, rgba);
  return rgba;
};

const normalizeStyleValueForHtml2Canvas = (value: string): string =>
  value.replace(MODERN_CSS_COLOR_FUNCTION_PATTERN, (color) => convertModernCssColorToRgba(color));

const copyComputedStyle = (source: Element, target: Element): void => {
  const computed = window.getComputedStyle(source);
  target.removeAttribute("style");
  const targetStyle = (target as HTMLElement | SVGElement).style;
  if (!targetStyle) return;

  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (!property) continue;
    let value = computed.getPropertyValue(property);
    if (!value) continue;

    // Imagens do certificado são incorporadas separadamente como DataURL. Não
    // copie referências url(...) de CSS para a árvore congelada: elas fariam o
    // html2canvas consultar novamente folhas/fontes externas na Hostinger e
    // poderiam contaminar o canvas com CORS.
    if (/url\s*\(/i.test(value)) continue;
    if (property === "font-family") {
      value = /JetBrains Mono|monospace/i.test(value)
        ? '"Courier New", Courier, monospace'
        : "Arial, Helvetica, sans-serif";
    }
    value = normalizeStyleValueForHtml2Canvas(value);
    try {
      targetStyle.setProperty(property, value, computed.getPropertyPriority(property));
    } catch {
      // Some browser-only computed properties are read-only when reapplied.
    }
  }

  targetStyle.setProperty("animation", "none", "important");
  targetStyle.setProperty("transition", "none", "important");
  targetStyle.setProperty("caret-color", "transparent", "important");
  targetStyle.setProperty("background-image", "none", "important");
  targetStyle.setProperty("list-style-image", "none", "important");
  targetStyle.setProperty("mask-image", "none", "important");
  targetStyle.setProperty("-webkit-mask-image", "none", "important");
};

const freezeCertificateStyles = (source: HTMLElement, clone: HTMLElement): void => {
  // IMPORTANT: source must be the real, connected certificate DOM. Calling
  // getComputedStyle() on a detached clone returns browser defaults and destroys
  // the Tailwind layout (logo grows, grids collapse and text becomes tiny after
  // the final PDF fit). Keep source/clone trees identical until every computed
  // style has been copied.
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

  // Freeze from the LIVE certificate before removing any descendants. The
  // previous implementation froze a detached clone, so computed styles were
  // defaults instead of the actual certificate styles. That is the root cause
  // of the giant logo / collapsed columns seen in the downloaded PDF.
  freezeCertificateStyles(element, clone);

  clone
    .querySelectorAll<HTMLElement>('[data-certificate-pdf-ignore="true"]')
    .forEach((node) => node.remove());
  clone.removeAttribute("id");

  clone.style.setProperty("width", `${width}px`, "important");
  clone.style.setProperty("max-width", `${width}px`, "important");
  clone.style.setProperty("min-width", `${width}px`, "important");
  clone.style.setProperty("margin", "0", "important");
  clone.style.setProperty("transform", "none", "important");
  clone.style.setProperty("box-sizing", "border-box", "important");
  clone.style.setProperty("background", "#ffffff", "important");
  clone.style.setProperty("overflow", "visible", "important");

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

const isolateHtml2CanvasDocument = (clonedDocument: Document): void => {
  // A árvore-alvo já recebeu estilos inline com cores compatíveis. Remover as
  // folhas da cópia interna impede que o html2canvas reprocesse Tailwind 4,
  // Google Fonts ou qualquer outro recurso externo durante a exportação.
  clonedDocument
    .querySelectorAll('link[rel="stylesheet"], style')
    .forEach((stylesheet) => stylesheet.remove());

  const isolationStyle = clonedDocument.createElement("style");
  isolationStyle.textContent = `
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    img, svg { max-width: none; }
  `;
  clonedDocument.head.appendChild(isolationStyle);
};

/**
 * Baixa o mesmo certificado oficial exibido pelo Portal.
 *
 * A REV7 REV6 mantém o fluxo same-origin, a fidelidade/paginação da REV5 e
 * converte cores CSS modernas do Tailwind 4 para RGBA antes do html2canvas 1.4.
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
      scale: CERTIFICATE_CAPTURE_SCALE,
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
      onclone: isolateHtml2CanvasDocument,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("A captura do certificado retornou uma imagem vazia.");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // O canvas conserva o padding horizontal de 10 mm do certificado. Na
    // vertical, reserve também 10 mm no fim da primeira página e em ambas as
    // bordas das páginas seguintes, reproduzindo o @page do botão Imprimir.
    const a4PageHeightPx = Math.max(1, Math.floor(canvas.width * (pageHeight / pageWidth)));
    const pageMarginPx = Math.max(1, Math.round(canvas.width * (PDF_PAGE_MARGIN_MM / pageWidth)));
    const continuationContentHeightPx = Math.max(1, a4PageHeightPx - pageMarginPx * 2);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = a4PageHeightPx;
    const pageContext = pageCanvas.getContext("2d");
    if (!pageContext) {
      throw new Error("Não foi possível preparar as páginas A4 do certificado.");
    }

    let sourceY = 0;
    let pageIndex = 0;
    while (sourceY < canvas.height) {
      const destinationY = pageIndex === 0 ? 0 : pageMarginPx;
      const availableSourceHeight =
        pageIndex === 0 ? a4PageHeightPx - pageMarginPx : continuationContentHeightPx;
      const sourceHeight = Math.min(availableSourceHeight, canvas.height - sourceY);
      pageContext.save();
      pageContext.fillStyle = "#ffffff";
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageContext.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sourceHeight,
        0,
        destinationY,
        canvas.width,
        sourceHeight,
      );
      pageContext.restore();

      const pageDataUrl = pageCanvas.toDataURL("image/png", 1);
      if (!pageDataUrl || pageDataUrl === "data:,") {
        throw new Error(`A página ${pageIndex + 1} do certificado não gerou uma imagem válida.`);
      }
      if (pageIndex > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(
        pageDataUrl,
        "PNG",
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        "FAST",
      );

      sourceY += sourceHeight;
      pageIndex += 1;
    }

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
