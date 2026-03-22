import React, { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from '@reduxjs/toolkit';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addElementsBatch, clearBasePdf } from '@/store/pdf-editor/slice';
import { selectBasePdf, selectSortedPages, selectElements } from '@/store/pdf-editor/selectors';
import {
  extractFromPdf,
  type PageExtraction,
  type ExtractedBlock,
  type ExtractedShape,
  type ExtractedTable,
  type ExtractionProgress,
} from '@/services/pdf-text-extractor';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CanvasElement, TextElement, LineElement, RectangleElement, TableElement, TableColumn } from '@/store/pdf-editor/types/elements';
import { ScanText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'extracting'; page: number; total: number; method: 'pdfjs' | 'ocr' }
  | { kind: 'done'; pages: PageExtraction[] }
  | { kind: 'error'; message: string };

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

function textBlockToElement(
  block: ExtractedBlock,
  pageId: string,
  zIndex: number,
): TextElement {
  const fontSize = Math.max(6, Math.min(144, block.fontSize));
  return {
    id: nanoid(), name: 'Text', type: 'text', pageId,
    position: { x: Math.round(block.x), y: Math.round(block.y) },
    width: Math.max(Math.round(block.width), 40),
    height: Math.max(Math.round(block.height), fontSize + 4),
    rotate: 0, opacity: 1, zIndex, locked: false, visible: true,
    content: block.text,
    fontSize,
    fontFamily: 'Helvetica',
    fontWeight: block.fontWeight,
    fontStyle: 'normal',
    fontColor: '#000000',
    textAlign: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
    textTransform: 'none',
    underline: false,
    strikethrough: false,
    backgroundColor: 'transparent',
    padding: 0,
  };
}

function shapeToElement(
  shape: ExtractedShape,
  pageId: string,
  zIndex: number,
): LineElement | RectangleElement {
  if (shape.kind === 'hline' || shape.kind === 'vline') {
    return {
      id: nanoid(), name: shape.kind === 'hline' ? 'H-Line' : 'V-Line',
      type: 'line', pageId,
      position: { x: Math.round(shape.x), y: Math.round(shape.y) },
      width: Math.max(Math.round(shape.width), 1),
      height: Math.max(Math.round(shape.height), 1),
      rotate: 0, opacity: 1, zIndex, locked: false, visible: true,
      strokeColor: shape.strokeColor,
      strokeWidth: Math.max(Math.round(shape.strokeWidth), 1),
      dashArray: [],
      lineCap: 'butt',
    };
  }
  return {
    id: nanoid(), name: 'Rectangle', type: 'rectangle', pageId,
    position: { x: Math.round(shape.x), y: Math.round(shape.y) },
    width: Math.max(Math.round(shape.width), 2),
    height: Math.max(Math.round(shape.height), 2),
    rotate: 0, opacity: 1, zIndex, locked: false, visible: true,
    fillColor: shape.fillColor === 'transparent' ? '#ffffff' : shape.fillColor,
    fillOpacity: shape.fillColor === 'transparent' ? 0 : 1,
    strokeColor: shape.strokeColor,
    strokeWidth: Math.max(Math.round(shape.strokeWidth), 1),
    cornerRadius: 0,
    transparent: shape.fillColor === 'transparent',
  };
}

function tableToElement(
  table: ExtractedTable,
  pageId: string,
  zIndex: number,
): TableElement {
  const columns: TableColumn[] = table.colWidths.map((w, i) => ({
    id: nanoid(),
    label: `Col ${i + 1}`,
    width: Math.max(Math.round(w), 20),
  }));

  // If first row looks like a header (bold or all-caps), use it as column labels
  const firstRow = table.cells[0] ?? [];
  const looksLikeHeader = firstRow.every(c => c && (c === c.toUpperCase() || c.length < 30));
  if (looksLikeHeader && table.cells.length > 1) {
    firstRow.forEach((label, i) => { if (label) columns[i].label = label; });
  }

  const dataRows = looksLikeHeader && table.cells.length > 1 ? table.cells.slice(1) : table.cells;

  const cellStyle = {
    bg: '#ffffff',
    textColor: '#000000',
    fontSize: 11,
    fontWeight: 'normal' as const,
    borderColor: table.borderColor,
    textAlign: 'left' as const,
    verticalAlign: 'middle' as const,
  };

  return {
    id: nanoid(), name: 'Table', type: 'table', pageId,
    position: { x: Math.round(table.x), y: Math.round(table.y) },
    width: Math.max(Math.round(table.width), 40),
    height: Math.max(Math.round(table.height), 20),
    rotate: 0, opacity: 1, zIndex, locked: false, visible: true,
    columns,
    rowHeights: table.rowHeights.map(h => Math.max(Math.round(h), 16)),
    headerStyle: { ...cellStyle, bg: '#f3f4f6', fontWeight: 'bold' },
    bodyStyle: cellStyle,
    data: dataRows,
    showHeader: true,
    repeatHeaderOnPageBreak: false,
    borderWidth: Math.max(table.borderWidth, 1),
    borderColor: table.borderColor,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OcrImportDialog = React.memo(({ open, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const basePdf = useAppSelector(selectBasePdf);
  const pages = useAppSelector(selectSortedPages);
  const elements = useAppSelector(selectElements);

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!open || !basePdf) return;
    cancelRef.current = false;
    setPhase({ kind: 'idle' });
    let cancelled = false;

    extractFromPdf(
      basePdf.data,
      basePdf.pageImages,
      (p: ExtractionProgress) => {
        if (cancelled) return;
        setPhase({ kind: 'extracting', page: p.page, total: p.total, method: p.method });
      },
    )
      .then(result => { if (!cancelled) setPhase({ kind: 'done', pages: result }); })
      .catch(err => { if (!cancelled) setPhase({ kind: 'error', message: String(err) }); });

    return () => { cancelled = true; };
  }, [open, basePdf]);

  const handleImport = useCallback(() => {
    if (phase.kind !== 'done') return;

    const sortedPages = [...pages].sort((a, b) => a.order - b.order);
    const newEls: CanvasElement[] = [];

    phase.pages.forEach((pageData, pi) => {
      const page = sortedPages[pi];
      if (!page) return;
      const base = Object.values(elements).filter(e => e.pageId === page.id).length;
      let zi = base;

      pageData.textBlocks.forEach(b => { newEls.push(textBlockToElement(b, page.id, zi++)); });
      pageData.shapes.forEach(s => { newEls.push(shapeToElement(s, page.id, zi++)); });
      pageData.tables.forEach(t => { newEls.push(tableToElement(t, page.id, zi++)); });
    });

    dispatch(addElementsBatch(newEls));
    dispatch(clearBasePdf());
    onClose();
  }, [phase, pages, elements, dispatch, onClose]);

  const handleClose = () => { cancelRef.current = true; onClose(); };

  const totals = phase.kind === 'done' ? {
    text: phase.pages.reduce((s, p) => s + p.textBlocks.length, 0),
    shapes: phase.pages.reduce((s, p) => s + p.shapes.length, 0),
    tables: phase.pages.reduce((s, p) => s + p.tables.length, 0),
  } : null;

  const totalAll = totals ? totals.text + totals.shapes + totals.tables : 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText size={16} />
            Extract Content from PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Extracting */}
          {(phase.kind === 'idle' || phase.kind === 'extracting') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin shrink-0" />
                {phase.kind === 'idle'
                  ? 'Starting extraction…'
                  : `Processing page ${phase.page} of ${phase.total} via ${phase.method === 'ocr' ? 'OCR (slow)' : 'text layer'}…`}
              </div>
              {phase.kind === 'extracting' && (
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${(phase.page / phase.total) * 100}%` }}
                  />
                </div>
              )}
              {phase.kind === 'extracting' && phase.method === 'ocr' && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5 leading-relaxed">
                  Scanned page — running OCR. May take 10–30 seconds.
                </p>
              )}
            </div>
          )}

          {/* Done */}
          {phase.kind === 'done' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 size={14} className="shrink-0" />
                Extraction complete
              </div>

              <div className="rounded border bg-muted/40 divide-y text-xs max-h-52 overflow-y-auto">
                {phase.pages.map((p, i) => (
                  <div key={i} className="grid grid-cols-4 gap-1 px-3 py-2 items-center">
                    <span className="font-medium text-foreground">Page {i + 1}</span>
                    <span className="text-muted-foreground text-center">{p.textBlocks.length} text</span>
                    <span className="text-muted-foreground text-center">{p.shapes.length} shapes</span>
                    <span className="text-muted-foreground text-center">{p.tables.length} tables</span>
                  </div>
                ))}
              </div>

              {totalAll === 0 ? (
                <p className="text-xs text-muted-foreground">No content found in this PDF.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Found <strong>{totals!.text}</strong> text blocks,{' '}
                  <strong>{totals!.shapes}</strong> shapes, and{' '}
                  <strong>{totals!.tables}</strong> tables across {phase.pages.length} page{phase.pages.length !== 1 ? 's' : ''}.
                  All will be placed as editable elements.
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {phase.kind === 'error' && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Extraction failed: {phase.message}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            {phase.kind === 'done' && totalAll > 0 && (
              <Button size="sm" onClick={handleImport}>
                Import {totalAll} element{totalAll !== 1 ? 's' : ''} to Canvas
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
OcrImportDialog.displayName = 'OcrImportDialog';
