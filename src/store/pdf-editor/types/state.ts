import type { CanvasElement } from './elements';

export interface BasePdfState {
  fileName: string;
  /** base64 data URL of the raw PDF bytes — used by the generator to embed pages */
  data: string;
  /** PNG data URLs rendered from each page — used as canvas backgrounds */
  pageImages: string[];
  pageDimensions: { width: number; height: number }[];
  pageCount: number;
}

export interface Page {
  id: string;
  name: string;
  width: number;
  height: number;
  order: number;
  backgroundColor: string;
}

export interface PdfEditorSnapshot {
  pages: Page[];
  elements: Record<string, CanvasElement>;
}

export interface PdfEditorState {
  basePdf: BasePdfState | null;
  pages: Page[];
  currentPageId: string;
  elements: Record<string, CanvasElement>;
  selectedElementIds: string[];
  zoom: number;
  templateName: string;
  isDirty: boolean;
  showGrid: boolean;
  history: {
    past: PdfEditorSnapshot[];
    future: PdfEditorSnapshot[];
  };
}
