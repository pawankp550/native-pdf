import type { PDFPage, PDFDocument, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import type { TableElement } from '../../../store/pdf-editor/types/elements';
import { hexToRgb } from '../utils/color';
import { canvasToPdfY } from '../utils/coordinates';

export interface TableRenderResult {
  pages: PDFPage[];
  totalDataHeight: number;
  finalY: number;
}

export function renderTable(
  initialPage: PDFPage,
  el: TableElement,
  doc: PDFDocument,
  font: PDFFont,
  boldFont: PDFFont,
): TableRenderResult {
  const pageHeight = initialPage.getHeight();
  const pageWidth = initialPage.getWidth();
  const borderC = hexToRgb(el.borderColor);
  const borderColor = rgb(borderC.r, borderC.g, borderC.b);

  let currentPage = initialPage;
  let currentY = el.position.y;
  const pages: PDFPage[] = [initialPage];
  let totalDataHeight = 0;

  const drawRow = (rowData: string[], style: typeof el.headerStyle, rowHeight: number) => {
    const pdfY = canvasToPdfY(currentY, rowHeight, pageHeight);
    let x = el.position.x;
    const bg = hexToRgb(style.bg);
    const tc = hexToRgb(style.textColor);

    el.columns.forEach((col, ci) => {
      currentPage.drawRectangle({
        x,
        y: pdfY,
        width: col.width,
        height: rowHeight,
        color: rgb(bg.r, bg.g, bg.b),
        borderColor,
        borderWidth: el.borderWidth,
      });
      const text = rowData[ci] ?? '';
      if (text) {
        const usedFont = style.fontWeight === 'bold' ? boldFont : font;
        const textWidth = usedFont.widthOfTextAtSize(text, style.fontSize);
        const innerWidth = col.width - 8;
        let textX = x + 4;
        if (style.textAlign === 'center') {
          textX = x + Math.max(4, (col.width - Math.min(textWidth, innerWidth)) / 2);
        } else if (style.textAlign === 'right') {
          textX = x + col.width - 4 - Math.min(textWidth, innerWidth);
        }
        let textY: number;
        if (style.verticalAlign === 'top') {
          textY = pdfY + rowHeight - style.fontSize - 4;
        } else if (style.verticalAlign === 'middle') {
          textY = pdfY + (rowHeight - style.fontSize) / 2;
        } else {
          textY = pdfY + 4;
        }
        currentPage.drawText(text, {
          x: textX,
          y: textY,
          size: style.fontSize,
          font: usedFont,
          color: rgb(tc.r, tc.g, tc.b),
        });
      }
      x += col.width;
    });

    currentY += rowHeight;
  };

  const drawHeader = () => {
    if (!el.showHeader) return;
    const headerHeight = el.rowHeights[0] ?? 24;
    drawRow(el.columns.map(c => c.label), el.headerStyle, headerHeight);
  };

  drawHeader();

  el.data.forEach((row, ri) => {
    const rowHeight = el.rowHeights[(el.showHeader ? ri + 1 : ri)] ?? 20;

    if (currentY + rowHeight > pageHeight) {
      const newPage = doc.addPage([pageWidth, pageHeight]);
      pages.push(newPage);
      currentPage = newPage;
      currentY = 0;
      if (el.repeatHeaderOnPageBreak) {
        drawHeader();
      }
    }

    drawRow(row, el.bodyStyle, rowHeight);
    totalDataHeight += rowHeight;
  });

  return { pages, totalDataHeight, finalY: currentY };
}
