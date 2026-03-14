import QRCode from 'qrcode';
import type { PDFPage, PDFDocument } from 'pdf-lib';
import type { QrCodeElement } from '../../../store/pdf-editor/types/elements';

export async function renderQrCode(
  page: PDFPage,
  el: QrCodeElement,
  pdfDoc: PDFDocument,
  pageHeight: number,
): Promise<void> {
  if (!el.data) return;

  // Render at 3× for sharper output, then scale down to element size
  const renderSize = Math.min(el.width, el.height) * 3;

  const dataUrl = await QRCode.toDataURL(el.data, {
    width: renderSize,
    margin: el.margin,
    errorCorrectionLevel: el.errorLevel,
    color: { dark: el.fgColor, light: el.bgColor },
    type: 'image/png',
  });

  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const img = await pdfDoc.embedPng(bytes);

  const size = Math.min(el.width, el.height);
  // Centre within the element box
  const offsetX = (el.width - size) / 2;
  const offsetY = (el.height - size) / 2;
  const pdfX = el.position.x + offsetX;
  const pdfY = pageHeight - el.position.y - el.height + offsetY;

  page.drawImage(img, { x: pdfX, y: pdfY, width: size, height: size });
}
