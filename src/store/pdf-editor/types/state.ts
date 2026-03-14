import type { CanvasElement } from './elements';

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
