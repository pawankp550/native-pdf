import type { PDFPage, PDFDocument } from 'pdf-lib';
import type { ImageElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';

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

function svgToPng(src: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let svgSrc = src;
    if (src.startsWith('data:image/svg+xml;charset=utf-8,')) {
      const svgStr = decodeURIComponent(src.slice('data:image/svg+xml;charset=utf-8,'.length))
        .replace(/\bwidth="[^"]*"/, `width="${width}"`)
        .replace(/\bheight="[^"]*"/, `height="${height}"`);
      svgSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = svgSrc;
  });
}

export async function renderImage(
  page: PDFPage,
  el: ImageElement,
  pdfDoc: PDFDocument,
  pageHeight: number,
): Promise<void> {
  if (!el.src) return;

  const src = el.src.startsWith('data:image/svg+xml')
    ? await svgToPng(el.src, el.width, el.height)
    : el.src;

  const { bytes, mimeType } = base64ToBytes(src);

  let image;
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    image = await pdfDoc.embedJpg(bytes);
  } else {
    image = await pdfDoc.embedPng(bytes);
  }

  const pdfX = el.position.x;
  const pdfY = canvasToPdfY(el.position.y, el.height, pageHeight);

  if (el.objectFit === 'contain') {
    const scale = Math.min(el.width / image.width, el.height / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const offsetX = (el.width - drawW) / 2;
    const offsetY = (el.height - drawH) / 2;
    page.drawImage(image, { x: pdfX + offsetX, y: pdfY + offsetY, width: drawW, height: drawH });
  } else if (el.objectFit === 'cover') {
    const scale = Math.max(el.width / image.width, el.height / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const offsetX = (el.width - drawW) / 2;
    const offsetY = (el.height - drawH) / 2;
    page.drawImage(image, { x: pdfX + offsetX, y: pdfY + offsetY, width: drawW, height: drawH });
  } else {
    page.drawImage(image, { x: pdfX, y: pdfY, width: el.width, height: el.height });
  }
}
