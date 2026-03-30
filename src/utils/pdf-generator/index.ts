import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFPage, PDFFont } from 'pdf-lib';
import type { Page, BasePdfState } from '../../store/pdf-editor/types/state';
import type { CanvasElement, TableElement, ImageElement, PageNumberElement, QrCodeElement, DateElement, HeadingElement, SignaturePadElement, LinkElement, BarcodeElement, RadioElement } from '../../store/pdf-editor/types/elements';
import { STANDARD_PDF_FONTS } from '@/constants/fonts';
import type { FontFamily } from '@/constants/fonts';
import { getFontName } from './utils/fonts';
import { fetchGoogleFontBytes } from './utils/font-loader';
import { renderText } from './renderers/text-renderer';
import { renderLine } from './renderers/line-renderer';
import { renderRectangle } from './renderers/rectangle-renderer';
import { renderCircle } from './renderers/circle-renderer';
import { renderCheckbox } from './renderers/checkbox-renderer';
import { renderTable } from './renderers/table-renderer';
import { renderSignature } from './renderers/signature-renderer';
import { renderImage } from './renderers/image-renderer';
import { renderPageNumber } from './renderers/page-number-renderer';
import { renderQrCode } from './renderers/qrcode-renderer';
import { renderDate } from './renderers/date-renderer';
import { renderHeading } from './renderers/heading-renderer';
import { renderSignaturePad } from './renderers/signature-pad-renderer';
import { renderLink } from './renderers/link-renderer';
import { renderBarcode } from './renderers/barcode-renderer';
import { renderRadio } from './renderers/radio-renderer';

interface TableOverflow {
  overflowed: boolean;
  finalY: number;
  lastPage: PDFPage;
}

interface CrossPageOverflow {
  yBaseOffset: number;
  basePage: PDFPage;
}

export async function generatePdf(
  pages: Page[],
  elements: Record<string, CanvasElement>,
  basePdf?: BasePdfState | null,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const usedFamilies = new Set<FontFamily>(['Helvetica']);
  for (const el of Object.values(elements)) {
    if ('fontFamily' in el && el.fontFamily) usedFamilies.add(el.fontFamily as FontFamily);
  }

  const fontMap: Record<string, { normal: PDFFont; bold: PDFFont }> = {};

  await Promise.all(
    Array.from(usedFamilies).map(async (family) => {
      try {
        if (STANDARD_PDF_FONTS.has(family)) {
          fontMap[family] = {
            normal: await pdfDoc.embedFont(getFontName(family, 'normal', 'normal')),
            bold:   await pdfDoc.embedFont(getFontName(family, 'bold',   'normal')),
          };
        } else {
          const [normalBytes, boldBytes] = await Promise.all([
            fetchGoogleFontBytes(family, 'normal', 'normal'),
            fetchGoogleFontBytes(family, 'bold',   'normal'),
          ]);
          fontMap[family] = {
            normal: await pdfDoc.embedFont(normalBytes),
            bold:   await pdfDoc.embedFont(boldBytes),
          };
        }
      } catch (err) {
        console.warn(`Failed to embed font "${family}", falling back to Helvetica:`, err);
      }
    }),
  );

  const helvetica = (fontMap['Helvetica'] ?? Object.values(fontMap)[0]).normal;

  let embeddedBasePages: Awaited<ReturnType<typeof pdfDoc.embedPages>> | null = null;
  if (basePdf?.data) {
    try {
      const base64 = basePdf.data.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const basePdfDoc = await PDFDocument.load(bytes);
      embeddedBasePages = await pdfDoc.embedPages(basePdfDoc.getPages());
    } catch (err) {
      console.error('Failed to embed base PDF pages:', err);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a.order - b.order);
  let prevOverflow: CrossPageOverflow | null = null;

  for (let pi = 0; pi < sortedPages.length; pi++) {
    const canvasPage = sortedPages[pi];
    const pageNum = pi + 1;

    let pdfPage: PDFPage;
    let yBaseOffset = 0;

    if (prevOverflow) {
      pdfPage = prevOverflow.basePage;
      yBaseOffset = prevOverflow.yBaseOffset;
      prevOverflow = null;
    } else {
      pdfPage = pdfDoc.addPage([canvasPage.width, canvasPage.height]);
      if (embeddedBasePages && embeddedBasePages[pi]) {
        pdfPage.drawPage(embeddedBasePages[pi], { x: 0, y: 0, width: canvasPage.width, height: canvasPage.height });
      } else if (canvasPage.backgroundColor && canvasPage.backgroundColor !== '#ffffff' && canvasPage.backgroundColor !== 'transparent') {
        const r = parseInt(canvasPage.backgroundColor.slice(1, 3), 16) / 255;
        const g = parseInt(canvasPage.backgroundColor.slice(3, 5), 16) / 255;
        const b = parseInt(canvasPage.backgroundColor.slice(5, 7), 16) / 255;
        pdfPage.drawRectangle({ x: 0, y: 0, width: canvasPage.width, height: canvasPage.height, color: rgb(r, g, b) });
      }
    }

    const pageElements = Object.values(elements)
      .filter(el => el.pageId === canvasPage.id && el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    const tableOverflowInfo = new Map<string, TableOverflow>();

    for (const el of pageElements) {
      if (el.type !== 'table') continue;
      try {
        const fonts = fontMap['Helvetica'];
        const shiftedEl = yBaseOffset > 0
          ? ({ ...el, position: { x: el.position.x, y: el.position.y + yBaseOffset } } as TableElement)
          : el as TableElement;
        const result = renderTable(pdfPage, shiftedEl, pdfDoc, fonts.normal, fonts.bold);
        tableOverflowInfo.set(el.id, {
          overflowed: result.pages.length > 1,
          finalY: result.finalY,
          lastPage: result.pages[result.pages.length - 1],
        });
      } catch (err) {
        console.error(`Error rendering table ${el.id}:`, err);
      }
    }

    for (const el of pageElements) {
      if (el.type === 'table') continue;
      try {
        let adjustedY = el.position.y + yBaseOffset;
        let targetPage: PDFPage = pdfPage;

        for (const [tableId, info] of tableOverflowInfo) {
          if (!info.overflowed) continue;
          const tableEl = elements[tableId] as TableElement;
          const tableBottomCanvas = tableEl.position.y + tableEl.height;
          if (el.position.y < tableBottomCanvas) continue;
          const gap = el.position.y - tableBottomCanvas;
          adjustedY = info.finalY + gap;
          targetPage = info.lastPage;
          break;
        }

        const pos = adjustedY !== el.position.y
          ? { ...el, position: { x: el.position.x, y: adjustedY } }
          : el;

        switch (pos.type) {
          case 'text': {
            const fonts = fontMap[pos.fontFamily] ?? fontMap['Helvetica'];
            await renderText(targetPage, pos, fonts.normal, fonts.bold);
            break;
          }
          case 'line':      renderLine(targetPage, pos); break;
          case 'rectangle': renderRectangle(targetPage, pos); break;
          case 'circle':    renderCircle(targetPage, pos); break;
          case 'checkbox':  renderCheckbox(targetPage, pos); break;
          case 'signature': renderSignature(targetPage, pos, helvetica); break;
          case 'image':     await renderImage(targetPage, pos as ImageElement, pdfDoc, canvasPage.height); break;
          case 'page-number': {
            const fonts = fontMap[(pos as PageNumberElement).fontFamily] ?? fontMap['Helvetica'];
            renderPageNumber(targetPage, pos as PageNumberElement, fonts.normal, fonts.bold, pageNum, sortedPages.length);
            break;
          }
          case 'qr-code':   await renderQrCode(targetPage, pos as QrCodeElement, pdfDoc, canvasPage.height); break;
          case 'date': {
            const fonts = fontMap[(pos as DateElement).fontFamily] ?? fontMap['Helvetica'];
            renderDate(targetPage, pos as DateElement, fonts.normal, fonts.bold);
            break;
          }
          case 'heading': {
            const fonts = fontMap[(pos as HeadingElement).fontFamily] ?? fontMap['Helvetica'];
            renderHeading(targetPage, pos as HeadingElement, fonts.normal, fonts.bold);
            break;
          }
          case 'signature-pad': await renderSignaturePad(targetPage, pos as SignaturePadElement, pdfDoc); break;
          case 'link': {
            const fonts = fontMap[(pos as LinkElement).fontFamily] ?? fontMap['Helvetica'];
            renderLink(targetPage, pos as LinkElement, fonts.normal);
            break;
          }
          case 'barcode': await renderBarcode(targetPage, pos as BarcodeElement, pdfDoc); break;
          case 'radio':   renderRadio(targetPage, pos as RadioElement, helvetica); break;
        }
      } catch (err) {
        console.error(`Error rendering element ${el.id}:`, err);
      }
    }

    let maxFinalY = 0;
    let lastOverflowPage: PDFPage | null = null;
    for (const [, info] of tableOverflowInfo) {
      if (info.overflowed && (lastOverflowPage === null || info.finalY >= maxFinalY)) {
        maxFinalY = info.finalY;
        lastOverflowPage = info.lastPage;
      }
    }
    if (lastOverflowPage !== null) {
      prevOverflow = { yBaseOffset: maxFinalY, basePage: lastOverflowPage };
    }
  }

  return pdfDoc.save();
}
