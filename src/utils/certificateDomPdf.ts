import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export const downloadCertificateDomAsPdf = async (
  element: HTMLElement,
  fileName: string
): Promise<void> => {
  // Capture image using html-to-image
  // Filter out elements marked with data-certificate-pdf-ignore="true"
  const filter = (node: HTMLElement) => {
    if (node && node.hasAttribute && node.hasAttribute('data-certificate-pdf-ignore')) {
      return false;
    }
    return true;
  };

  // Wait a small bit to ensure fonts/layout are stable
  await new Promise((resolve) => setTimeout(resolve, 50));

  const dataUrl = await toPng(element, {
    quality: 1.0,
    pixelRatio: 2, // High resolution for PDF
    filter: filter as any,
    style: {
      // Force styles that mimic printing layout
      margin: '0',
      padding: '0',
      boxShadow: 'none',
      border: 'none',
      borderRadius: '0',
      transform: 'scale(1)',
      transformOrigin: 'top left',
    },
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const imgProps = pdf.getImageProperties(dataUrl);
  
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;

  const pdfWidth = A4_WIDTH_MM;
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  // Add the image to the PDF
  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  
  // Save the PDF
  pdf.save(fileName);
};
