import type { PDFPage, PDFDocument } from 'pdf-lib';
import type { ImageElement } from '../../../store/pdf-editor/types/elements';

function base64ToBytes(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const [header, base64] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mimeType };
}

export async function renderImage(
  page: PDFPage,
  el: ImageElement,
  pdfDoc: PDFDocument,
  pageHeight: number,
): Promise<void> {
  if (!el.src) return;

  const { bytes, mimeType } = base64ToBytes(el.src);

  let image;
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    image = await pdfDoc.embedJpg(bytes);
  } else {
    // png, gif, webp, svg → embed as png (pdf-lib only supports jpg/png natively)
    image = await pdfDoc.embedPng(bytes);
  }

  const pdfX = el.position.x;
  // canvas Y → PDF Y (bottom-left origin)
  const pdfY = pageHeight - el.position.y - el.height;

  if (el.objectFit === 'contain') {
    // Scale uniformly to fit inside the box, centred
    const scale = Math.min(el.width / image.width, el.height / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const offsetX = (el.width - drawW) / 2;
    const offsetY = (el.height - drawH) / 2;
    page.drawImage(image, { x: pdfX + offsetX, y: pdfY + offsetY, width: drawW, height: drawH });
  } else if (el.objectFit === 'cover') {
    // Scale uniformly to fill the box — pdf-lib doesn't support clipping,
    // so we draw at fill size and accept bleed-over (no true clip support).
    const scale = Math.max(el.width / image.width, el.height / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const offsetX = (el.width - drawW) / 2;
    const offsetY = (el.height - drawH) / 2;
    page.drawImage(image, { x: pdfX + offsetX, y: pdfY + offsetY, width: drawW, height: drawH });
  } else {
    // fill: stretch to exact box
    page.drawImage(image, { x: pdfX, y: pdfY, width: el.width, height: el.height });
  }
}
