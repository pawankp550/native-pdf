import { PDFDocument, rgb } from 'pdf-lib';
import type { PDFPage, PDFFont } from 'pdf-lib';
import type { Page, BasePdfState } from '../../store/pdf-editor/types/state';
import type { CanvasElement, TableElement, ImageElement, PageNumberElement, QrCodeElement, DateElement, HeadingElement, SignaturePadElement, LinkElement, BarcodeElement, RadioElement, BulletListElement } from '../../store/pdf-editor/types/elements';
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
import { renderBulletList } from './renderers/bullet-list-renderer';

interface TableOverflow {
  overflowed: boolean; // true when the table created at least one extra PDF page
  finalY: number;      // currentY after last row, on the last PDF page used by the table
  lastPage: PDFPage;   // the PDF page where the table ends
}

// Carried across canvas-page iterations: when page N's table overflowed, page N+1
// should continue on the overflow page rather than starting a fresh PDF page.
interface CrossPageOverflow {
  yBaseOffset: number; // all of page N+1's elements are shifted down by this amount
  basePage: PDFPage;   // the overflow page to render page N+1 onto
}

export async function generatePdf(
  pages: Page[],
  elements: Record<string, CanvasElement>,
  basePdf?: BasePdfState | null,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Collect font families actually used — only embed what the document needs
  const usedFamilies = new Set<FontFamily>(['Helvetica']); // always embed fallback
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

  // Pre-embed all base PDF pages so we can stamp them as backgrounds
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

  // Overflow carried from the previous canvas page's table into the next page.
  let prevOverflow: CrossPageOverflow | null = null;

  for (let pi = 0; pi < sortedPages.length; pi++) {
    const canvasPage = sortedPages[pi];
    const pageNum = pi + 1;

    // Either reuse the last overflow page from the previous canvas page's table,
    // or add a fresh PDF page for this canvas page.
    let pdfPage: PDFPage;
    let yBaseOffset = 0; // Y shift applied to every element on this canvas page

    if (prevOverflow) {
      pdfPage = prevOverflow.basePage;
      yBaseOffset = prevOverflow.yBaseOffset;
      prevOverflow = null;
    } else {
      pdfPage = pdfDoc.addPage([canvasPage.width, canvasPage.height]);
      // Stamp base PDF page as background (scales it to fill the canvas page exactly)
      if (embeddedBasePages && embeddedBasePages[pi]) {
        pdfPage.drawPage(embeddedBasePages[pi], {
          x: 0,
          y: 0,
          width: canvasPage.width,
          height: canvasPage.height,
        });
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

    // --- Pass 1: render tables ---
    // Tables are shifted by yBaseOffset so they start after any carry-over content
    // from the previous canvas page's overflow.
    const tableOverflowInfo = new Map<string, TableOverflow>();

    for (const el of pageElements) {
      if (el.type !== 'table') continue;
      try {
        const fonts = fontMap['Helvetica'];
        // Apply yBaseOffset to the table's start position
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

    // --- Pass 2: render non-table elements ---
    for (const el of pageElements) {
      if (el.type === 'table') continue;
      try {
        // Start with the base offset from any cross-page overflow
        let adjustedY = el.position.y + yBaseOffset;
        let targetPage: PDFPage = pdfPage;

        // Then check if this element is below a within-page overflowing table
        for (const [tableId, info] of tableOverflowInfo) {
          if (!info.overflowed) continue;
          const tableEl = elements[tableId] as TableElement;
          const tableBottomCanvas = tableEl.position.y + tableEl.height;
          if (el.position.y < tableBottomCanvas) continue;

          // Preserve the gap from the table's canvas bottom edge,
          // relative to where the table actually ends on its last PDF page.
          // finalY already incorporates yBaseOffset (since the table was shifted).
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
          case 'line':
            renderLine(targetPage, pos);
            break;
          case 'rectangle':
            renderRectangle(targetPage, pos);
            break;
          case 'circle':
            renderCircle(targetPage, pos);
            break;
          case 'checkbox':
            renderCheckbox(targetPage, pos);
            break;
          case 'signature':
            renderSignature(targetPage, pos, helvetica);
            break;
          case 'image':
            await renderImage(targetPage, pos as ImageElement, pdfDoc, canvasPage.height);
            break;
          case 'page-number': {
            const fonts = fontMap[(pos as PageNumberElement).fontFamily] ?? fontMap['Helvetica'];
            renderPageNumber(targetPage, pos as PageNumberElement, fonts.normal, fonts.bold, pageNum, sortedPages.length);
            break;
          }
          case 'qr-code':
            await renderQrCode(targetPage, pos as QrCodeElement, pdfDoc, canvasPage.height);
            break;
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
          case 'signature-pad':
            await renderSignaturePad(targetPage, pos as SignaturePadElement, pdfDoc);
            break;
          case 'link': {
            const fonts = fontMap[(pos as LinkElement).fontFamily] ?? fontMap['Helvetica'];
            renderLink(targetPage, pos as LinkElement, fonts.normal);
            break;
          }
          case 'barcode':
            await renderBarcode(targetPage, pos as BarcodeElement, pdfDoc);
            break;
          case 'radio':
            renderRadio(targetPage, pos as RadioElement, helvetica);
            break;
          case 'bullet-list': {
            const fonts = fontMap['Helvetica'];
            renderBulletList(targetPage, pos as BulletListElement, fonts.normal);
            break;
          }
        }
      } catch (err) {
        console.error(`Error rendering element ${el.id}:`, err);
      }
    }

    // --- Carry overflow to the next canvas page ---
    // If any table on this page overflowed to additional PDF pages, the next canvas
    // page should continue on the last overflow page (below the table) instead of
    // starting a brand-new PDF page.
    let maxFinalY = 0;
    let lastOverflowPage: PDFPage | null = null;

    for (const [, info] of tableOverflowInfo) {
      if (info.overflowed) {
        // Take the overflow that ends furthest down the page
        if (lastOverflowPage === null || info.finalY >= maxFinalY) {
          maxFinalY = info.finalY;
          lastOverflowPage = info.lastPage;
        }
      }
    }

    if (lastOverflowPage !== null) {
      prevOverflow = { yBaseOffset: maxFinalY, basePage: lastOverflowPage };
    }
  }

  return pdfDoc.save();
}
