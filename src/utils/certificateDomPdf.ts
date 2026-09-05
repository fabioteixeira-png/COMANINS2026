import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { authJsonFetch } from "./authApi";

const CERTIFICATE_CAPTURE_SCALE = 2;
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

const inlineHtml2CanvasUnsafeStyles = (root: HTMLElement): void => {
  // Preserve the browser's native layout. We only inline computed values that
  // html2canvas 1.4.1 cannot parse (mainly Tailwind 4 OKLCH/LAB colors).
  // Copying every computed property changes table/rowSpan sizing and is the
  // source of the layout drift between native Print and direct Download.
  const nodes: Element[] = [root, ...Array.from(root.querySelectorAll("*"))];

  nodes.forEach((node) => {
    const view = node.ownerDocument.defaultView || window;
    const computed = view.getComputedStyle(node);
    const targetStyle = (node as HTMLElement | SVGElement).style;
    if (!targetStyle) return;

    for (let index = 0; index < computed.length; index += 1) {
      const property = computed.item(index);
      if (!property) continue;
      const value = computed.getPropertyValue(property);
      if (!value || !/\b(?:oklch|oklab|lab|lch|color)\(/i.test(value)) continue;

      const normalizedValue = normalizeStyleValueForHtml2Canvas(value);
      try {
        targetStyle.setProperty(property, normalizedValue, computed.getPropertyPriority(property));
      } catch {
        // Ignore browser-only/read-only computed properties.
      }
    }

    targetStyle.setProperty("animation", "none", "important");
    targetStyle.setProperty("transition", "none", "important");
    targetStyle.setProperty("caret-color", "transparent", "important");
  });
};

type CertificateClone = {
  container: HTMLDivElement;
  clone: HTMLElement;
  width: number;
  height: number;
  resultsPageBreak?: {
    firstPageEndY: number;
    continuationStartY: number;
  };
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
  const loadedFaces = await Promise.all([
    fontSet.load('400 11px "Inter"'),
    fontSet.load('700 14px "Inter"'),
    fontSet.load('500 10px "JetBrains Mono"'),
  ]);
  if (loadedFaces.some((faces) => faces.length === 0)) {
    throw new Error("As fontes oficiais do certificado não foram carregadas.");
  }
  await fontSet.ready;
};

const loadCertificateFontStylesheet = async (root: Document): Promise<void> => {
  const fontStylesheet = root.createElement("link");
  fontStylesheet.rel = "stylesheet";
  fontStylesheet.href = CERTIFICATE_FONT_STYLESHEET_URL;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Tempo excedido ao carregar as fontes oficiais do certificado."));
    }, IMAGE_WAIT_TIMEOUT_MS);
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      fontStylesheet.onload = null;
      fontStylesheet.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    fontStylesheet.onload = () => finish();
    fontStylesheet.onerror = () =>
      finish(new Error("Falha ao carregar as fontes oficiais do certificado."));
    root.head.appendChild(fontStylesheet);
  });
};

const measureResultsPageBreak = (
  root: HTMLElement,
): CertificateClone["resultsPageBreak"] => {
  const table = Array.from(root.querySelectorAll("table")).find((candidate) =>
    candidate.nextElementSibling?.textContent?.includes("Índice de Classe"),
  );
  const continuation = table?.nextElementSibling;
  if (!table || !(continuation instanceof HTMLElement)) return undefined;

  const rootRect = root.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  const continuationRect = continuation.getBoundingClientRect();
  const firstPageEndY = Math.ceil(tableRect.bottom - rootRect.top);
  const continuationStartY = Math.floor(continuationRect.top - rootRect.top);
  if (firstPageEndY <= 0 || continuationStartY <= firstPageEndY) return undefined;
  return { firstPageEndY, continuationStartY };
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

    // Keep the print-width clone under the same Tailwind stylesheet used by the
    // native Print button. Only unsupported modern colors are converted inline;
    // geometry, table layout, rowSpan/colSpan, fonts and spacing remain native.
    inlineHtml2CanvasUnsafeStyles(printSource);
    await waitForStableCertificate(printSource);

    const cloneRect = printSource.getBoundingClientRect();
    const width = Math.max(1, Math.round(cloneRect.width || PRINT_CONTENT_WIDTH_PX));
    const height = Math.max(1, Math.ceil(printSource.scrollHeight || cloneRect.height));
    const resultsPageBreak = measureResultsPageBreak(printSource);
    return { container, clone: printSource, width, height, resultsPageBreak };
  } catch (error) {
    container.remove();
    throw error;
  }
};

const stabilizeHtml2CanvasDocument = async (clonedDocument: Document): Promise<void> => {
  // Do NOT remove the application's stylesheets here. The direct download must
  // use the same native CSS layout as the Print button. Removing Tailwind and
  // replacing the whole computed style tree with inline declarations changes
  // table metrics and causes clipped headers / different page breaks.
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
      border-radius: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
      transform: none !important;
      box-sizing: border-box !important;
      background: #fff !important;
      color: #000 !important;
    }
  `;
  clonedDocument.head.appendChild(isolationStyle);

  await waitForStylesheets(clonedDocument);
  await loadCertificateFontStylesheet(clonedDocument);
  if (clonedDocument.fonts) await waitForCertificateFonts(clonedDocument.fonts);

  const root = clonedDocument.querySelector<HTMLElement>('[data-certificate-download-root="true"]');
  if (!root) {
    throw new Error("A cópia do certificado não foi localizada durante a captura.");
  }
  inlineHtml2CanvasUnsafeStyles(root);
  await waitForImages(clonedDocument);
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
 * O download captura a mesma geometria de impressão A4, preserva Inter e
 * JetBrains Mono e escolhe quebras sem cortar tabelas ou conteúdo textual.
 * O layout permanece sob o CSS nativo do Portal; somente cores modernas que o
 * html2canvas não interpreta são convertidas inline. As imagens externas passam
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

    const captureCoordinateScale = canvas.width / prepared.width;
    const measuredResultsBreak = prepared.resultsPageBreak
      ? {
          firstPageEndY: Math.ceil(
            prepared.resultsPageBreak.firstPageEndY * captureCoordinateScale,
          ),
          continuationStartY: Math.floor(
            prepared.resultsPageBreak.continuationStartY * captureCoordinateScale,
          ),
        }
      : null;
    const resultsBreakFitsFirstPage =
      measuredResultsBreak !== null &&
      measuredResultsBreak.firstPageEndY > 0 &&
      measuredResultsBreak.firstPageEndY <= pageContentHeightPx &&
      measuredResultsBreak.continuationStartY > measuredResultsBreak.firstPageEndY &&
      measuredResultsBreak.continuationStartY < canvas.height;

    let sourceY = 0;
    let pageIndex = 0;
    while (sourceY < canvas.height) {
      const useMeasuredResultsBreak = pageIndex === 0 && resultsBreakFitsFirstPage;
      const sourceHeight = useMeasuredResultsBreak
        ? measuredResultsBreak.firstPageEndY
        : findSafePageSliceHeight(canvas, sourceY, pageContentHeightPx);
      const nextSourceY = useMeasuredResultsBreak
        ? measuredResultsBreak.continuationStartY
        : sourceY + sourceHeight;
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

      sourceY = nextSourceY;
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
