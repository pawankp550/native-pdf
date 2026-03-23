import type { PDFPage, PDFFont } from 'pdf-lib';
import { rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { LinkElement } from '../../../store/pdf-editor/types/elements';
import { canvasToPdfY } from '../utils/coordinates';
import { hexToRgb } from '../utils/color';
import { sanitizeForWinAnsi } from '../utils/sanitize-text';
import { STANDARD_PDF_FONTS } from '../../../constants/fonts';

export function renderLink(page: PDFPage, el: LinkElement, font: PDFFont): void {
  const pageHeight = page.getHeight();
  const { r, g, b } = hexToRgb(el.fontColor);
  const color = rgb(r, g, b);

  const rawLabel = el.label || el.url;
  if (!rawLabel) return;
  const label = STANDARD_PDF_FONTS.has(el.fontFamily)
    ? sanitizeForWinAnsi(rawLabel)
    : rawLabel;

  const textY = canvasToPdfY(el.position.y + el.padding, el.fontSize, pageHeight);

  let x = el.position.x + el.padding;
  if (el.textAlign === 'center') {
    const textWidth = font.widthOfTextAtSize(label, el.fontSize);
    const innerW = el.width - el.padding * 2;
    x = el.position.x + el.padding + (innerW - Math.min(textWidth, innerW)) / 2;
  } else if (el.textAlign === 'right') {
    const textWidth = font.widthOfTextAtSize(label, el.fontSize);
    x = el.position.x + el.width - el.padding - textWidth;
  }

  page.drawText(label, { x, y: textY, size: el.fontSize, font, color, opacity: el.opacity });

  // Underline
  const textWidth = font.widthOfTextAtSize(label, el.fontSize);
  page.drawLine({ start: { x, y: textY - 2 }, end: { x: x + textWidth, y: textY - 2 }, thickness: 1, color });

  // URI annotation covering the full element bounding box
  if (el.url?.trim()) {
    const pdfY = canvasToPdfY(el.position.y, el.height, pageHeight);
    const { context } = page.doc;
    const linkAnnot = context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: context.obj([el.position.x, pdfY, el.position.x + el.width, pdfY + el.height]),
      Border: context.obj([0, 0, 0]),
      A: context.obj({
        S: 'URI',
        URI: PDFString.of(el.url),
      }),
    });
    const linkRef = context.register(linkAnnot);
    const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (annots) {
      annots.push(linkRef);
    } else {
      page.node.set(PDFName.of('Annots'), context.obj([linkRef]));
    }
  }
}
