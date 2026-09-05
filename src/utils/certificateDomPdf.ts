import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { authJsonFetch } from "./authApi";

const CERTIFICATE_CAPTURE_SCALE = 1.5;
const IMAGE_WAIT_TIMEOUT_MS = 8000;
const A4_PAGE_WIDTH_MM = 210;
const A4_PAGE_HEIGHT_MM = 297;
const PDF_PAGE_MARGIN_MM = 10;
const PRINT_CONTENT_WIDTH_MM = A4_PAGE_WIDTH_MM - PDF_PAGE_MARGIN_MM * 2;
const PRINT_CONTENT_HEIGHT_MM = A4_PAGE_HEIGHT_MM - PDF_PAGE_MARGIN_MM * 2;
const CSS_PIXELS_PER_MM = 96 / 25.4;
const PRINT_CONTENT_WIDTH_PX = Math.round(PRINT_CONTENT_WIDTH_MM * CSS_PIXELS_PER_MM);
const SAFE_PAGE_BREAK_SEARCH_PX = Math.round(72 * CERTIFICATE_CAPTURE_SCALE);
const MIN_SAFE_BLANK_ROWS = Math.max(3, Math.round(2 * CERTIFICATE_CAPTURE_SCALE));
const CERTIFICATE_FONT_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";

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

const applyCertificatePrintLayout = (element: HTMLElement): void => {
  element.removeAttribute("id");
  element.setAttribute("data-certificate-download-root", "true");
  element.style.setProperty("display", "block", "important");
  element.style.setProperty("position", "relative", "important");
  element.style.setProperty("width", "100%", "important");
  element.style.setProperty("max-width", "100%", "important");
  element.style.setProperty("min-width", "0", "important");
  element.style.setProperty("height", "auto", "important");
  element.style.setProperty("min-height", "0", "important");
  element.style.setProperty("margin", "0", "important");
  element.style.setProperty("padding", "0", "important");
  element.style.setProperty("border", "none", "important");
  element.style.setProperty("border-radius", "0", "important");
  element.style.setProperty("box-shadow", "none", "important");
  element.style.setProperty("overflow", "visible", "important");
  element.style.setProperty("transform", "none", "important");
  element.style.setProperty("box-sizing", "border-box", "important");
  element.style.setProperty("background", "#ffffff", "important");
  element.style.setProperty("color", "#000000", "important");
};

const waitForCertificateFonts = async (fontSet: FontFaceSet): Promise<void> => {
  await Promise.all([
    fontSet.load('400 11px "Inter"'),
    fontSet.load('700 14px "Inter"'),
    fontSet.load('500 10px "JetBrains Mono"'),
  ]);
  await fontSet.ready;
};

const createFrozenCertificateClone = async (element: HTMLElement): Promise<CertificateClone> => {
  await waitForStableCertificate(element);

  // Monte primeiro a mesma geometria usada pelo @page da impressão: A4 com
  // margens de 10 mm, portanto 190 mm úteis. O clone de origem continua ligado
  // ao documento real para usar exatamente Inter, JetBrains Mono e as regras
  // Tailwind já carregadas pelo Portal.
  const printSource = element.cloneNode(true) as HTMLElement;
  printSource
    .querySelectorAll<HTMLElement>('[data-certificate-pdf-ignore="true"]')
    .forEach((node) => node.remove());
  applyCertificatePrintLayout(printSource);

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-30000px";
  container.style.top = "0";
  container.style.width = `${PRINT_CONTENT_WIDTH_PX}px`;
  container.style.minWidth = `${PRINT_CONTENT_WIDTH_PX}px`;
  container.style.maxWidth = `${PRINT_CONTENT_WIDTH_PX}px`;
  container.style.background = "#ffffff";
  container.style.overflow = "visible";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-2147483647";
  container.appendChild(printSource);
  document.body.appendChild(container);

  try {
    await inlineCertificateImages(printSource);
    if (document.fonts) await waitForCertificateFonts(document.fonts);
    await waitForStableCertificate(printSource);

    // Congele somente depois que o clone estiver em largura de impressão. Isso
    // evita copiar o display:flex, o padding de tela e a largura de 816 px que
    // não existem no PDF produzido pelo botão Imprimir.
    const clone = printSource.cloneNode(true) as HTMLElement;
    freezeCertificateStyles(printSource, clone);
    applyCertificatePrintLayout(clone);
    container.replaceChildren(clone);

    await waitForStableCertificate(clone);
    const cloneRect = clone.getBoundingClientRect();
    const width = Math.max(1, Math.round(cloneRect.width || PRINT_CONTENT_WIDTH_PX));
    const height = Math.max(1, Math.ceil(clone.scrollHeight || cloneRect.height));
    return { container, clone, width, height };
  } catch (error) {
    container.remove();
    throw error;
  }
};

const stabilizeHtml2CanvasDocument = async (clonedDocument: Document): Promise<void> => {
  // O layout já está integralmente congelado. Remova o Tailwind da cópia para
  // impedir qualquer reintrodução de OKLCH, mas recoloque apenas o stylesheet
  // de @font-face usado pelo botão Imprimir para manter Inter/JetBrains Mono.
  clonedDocument
    .querySelectorAll('link[rel="stylesheet"], style')
    .forEach((stylesheet) => stylesheet.remove());

  const fontStylesheet = clonedDocument.createElement("link");
  fontStylesheet.rel = "stylesheet";
  fontStylesheet.href = CERTIFICATE_FONT_STYLESHEET_URL;
  clonedDocument.head.appendChild(fontStylesheet);

  const isolationStyle = clonedDocument.createElement("style");
  isolationStyle.textContent = `
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    img, svg { max-width: none; }
    [data-certificate-download-root="true"] {
      display: block !important;
      width: ${PRINT_CONTENT_WIDTH_PX}px !important;
      max-width: ${PRINT_CONTENT_WIDTH_PX}px !important;
      min-width: 0 !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
      background: #fff !important;
    }
  `;
  clonedDocument.head.appendChild(isolationStyle);

  await waitForStylesheets(clonedDocument);
  if (clonedDocument.fonts) await waitForCertificateFonts(clonedDocument.fonts);
};

const isNearlyWhiteRow = (
  pixels: Uint8ClampedArray,
  width: number,
  row: number,
): boolean => {
  let nonWhitePixels = 0;
  const start = row * width * 4;
  const end = start + width * 4;
  for (let offset = start; offset < end; offset += 4) {
    if (pixels[offset] < 247 || pixels[offset + 1] < 247 || pixels[offset + 2] < 247) {
      nonWhitePixels += 1;
      if (nonWhitePixels > 2) return false;
    }
  }
  return true;
};

const findSafePageSliceHeight = (
  canvas: HTMLCanvasElement,
  sourceY: number,
  desiredHeight: number,
): number => {
  const remainingHeight = canvas.height - sourceY;
  if (remainingHeight <= desiredHeight) return remainingHeight;

  const desiredEnd = sourceY + desiredHeight;
  const searchStart = Math.max(sourceY + 1, desiredEnd - SAFE_PAGE_BREAK_SEARCH_PX);
  const searchHeight = desiredEnd - searchStart;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || searchHeight <= MIN_SAFE_BLANK_ROWS) return desiredHeight;

  try {
    const pixels = context.getImageData(0, searchStart, canvas.width, searchHeight).data;
    let blankRows = 0;
    let blankRunEnd = searchHeight;

    for (let row = searchHeight - 1; row >= 0; row -= 1) {
      if (isNearlyWhiteRow(pixels, canvas.width, row)) {
        if (blankRows === 0) blankRunEnd = row + 1;
        blankRows += 1;
        if (blankRows >= MIN_SAFE_BLANK_ROWS) {
          return Math.max(1, searchStart + blankRunEnd - sourceY);
        }
      } else {
        blankRows = 0;
      }
    }
  } catch {
    // A captura já usa somente imagens DataURL. Ainda assim, se o navegador
    // impedir a leitura dos pixels, preserve a paginação geométrica A4.
  }

  return desiredHeight;
};

/**
 * Baixa o mesmo certificado oficial exibido pelo Portal.
 *
 * A REV7 REV7 captura a mesma geometria de impressão A4, preserva Inter e
 * JetBrains Mono e escolhe quebras em áreas brancas para não cortar conteúdo.
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
      onclone: stabilizeHtml2CanvasDocument,
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
    const pageContentWidth = pageWidth - PDF_PAGE_MARGIN_MM * 2;
    const pageContentHeight = pageHeight - PDF_PAGE_MARGIN_MM * 2;

    // O clone já possui exatamente os 190 mm úteis do @page correto. Cada
    // página recebe 10 mm reais ao redor, sem reaproveitar o padding de tela.
    const pageContentHeightPx = Math.max(
      1,
      Math.floor(canvas.width * (PRINT_CONTENT_HEIGHT_MM / PRINT_CONTENT_WIDTH_MM)),
    );
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageContentHeightPx;
    const pageContext = pageCanvas.getContext("2d");
    if (!pageContext) {
      throw new Error("Não foi possível preparar as páginas A4 do certificado.");
    }

    let sourceY = 0;
    let pageIndex = 0;
    while (sourceY < canvas.height) {
      const sourceHeight = findSafePageSliceHeight(canvas, sourceY, pageContentHeightPx);
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
        0,
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
        PDF_PAGE_MARGIN_MM,
        PDF_PAGE_MARGIN_MM,
        pageContentWidth,
        pageContentHeight,
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
