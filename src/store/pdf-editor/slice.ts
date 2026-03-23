import { createSlice, nanoid } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { initialState } from './initial-state';
import type { PdfEditorState, Page, PdfEditorSnapshot, BasePdfState } from './types/state';
import type { CanvasElement, PageNumberElement } from './types/elements';

const MAX_HISTORY = 50;

function snapshot(state: PdfEditorState): PdfEditorSnapshot {
  return {
    pages: JSON.parse(JSON.stringify(state.pages)),
    elements: JSON.parse(JSON.stringify(state.elements)),
  };
}

function pushHistory(state: PdfEditorState) {
  state.history.past.push(snapshot(state));
  if (state.history.past.length > MAX_HISTORY) {
    state.history.past.shift();
  }
  state.history.future = [];
}

const slice = createSlice({
  name: 'pdfEditor',
  initialState,
  reducers: {
    // Elements
    addElement(state, action: PayloadAction<CanvasElement>) {
      pushHistory(state);
      state.elements[action.payload.id] = action.payload;
      state.isDirty = true;
    },
    // Adds a page-number element to ALL existing pages. The supplied element is used as the
    // template; copies with fresh IDs are created for every page.
    addPageNumberToAllPages(state, action: PayloadAction<PageNumberElement>) {
      pushHistory(state);
      const template = action.payload;
      for (const page of state.pages) {
        const copy: PageNumberElement = { ...template, id: nanoid(), pageId: page.id };
        state.elements[copy.id] = copy as CanvasElement;
      }
      state.isDirty = true;
    },
    updateElement(state, action: PayloadAction<{ id: string; changes: Partial<CanvasElement> }>) {
      pushHistory(state);
      const el = state.elements[action.payload.id];
      if (el) {
        Object.assign(el, action.payload.changes);
        state.isDirty = true;
      }
    },
    deleteElement(state, action: PayloadAction<string>) {
      pushHistory(state);
      delete state.elements[action.payload];
      state.selectedElementIds = state.selectedElementIds.filter(id => id !== action.payload);
      state.isDirty = true;
    },
    deleteSelectedElements(state) {
      if (state.selectedElementIds.length === 0) return;
      pushHistory(state);
      for (const id of state.selectedElementIds) {
        delete state.elements[id];
      }
      state.selectedElementIds = [];
      state.isDirty = true;
    },
    duplicateElement(state, action: PayloadAction<string>) {
      pushHistory(state);
      const el = state.elements[action.payload];
      if (!el) return;
      const newEl: CanvasElement = {
        ...JSON.parse(JSON.stringify(el)),
        id: nanoid(),
        name: el.name + ' Copy',
        position: { x: el.position.x + 10, y: el.position.y + 10 },
        zIndex: Object.values(state.elements).filter(e => e.pageId === el.pageId).length,
      };
      state.elements[newEl.id] = newEl;
      state.selectedElementIds = [newEl.id];
      state.isDirty = true;
    },
    duplicateSelectedElements(state) {
      if (state.selectedElementIds.length === 0) return;
      pushHistory(state);
      const newIds: string[] = [];
      for (const id of state.selectedElementIds) {
        const el = state.elements[id];
        if (!el) continue;
        const newEl: CanvasElement = {
          ...JSON.parse(JSON.stringify(el)),
          id: nanoid(),
          name: el.name + ' Copy',
          position: { x: el.position.x + 10, y: el.position.y + 10 },
          zIndex: Object.values(state.elements).filter(e => e.pageId === el.pageId).length,
        };
        state.elements[newEl.id] = newEl;
        newIds.push(newEl.id);
      }
      state.selectedElementIds = newIds;
      state.isDirty = true;
    },
    moveElement(state, action: PayloadAction<{ id: string; x: number; y: number }>) {
      const el = state.elements[action.payload.id];
      if (el) {
        el.position = { x: action.payload.x, y: action.payload.y };
        state.isDirty = true;
      }
    },
    resizeElement(state, action: PayloadAction<{ id: string; width: number; height: number; x?: number; y?: number }>) {
      const el = state.elements[action.payload.id];
      if (el) {
        el.width = action.payload.width;
        el.height = action.payload.height;
        if (action.payload.x !== undefined) el.position.x = action.payload.x;
        if (action.payload.y !== undefined) el.position.y = action.payload.y;
        state.isDirty = true;
      }
    },
    rotateElement(state, action: PayloadAction<{ id: string; rotate: number }>) {
      const el = state.elements[action.payload.id];
      if (el) {
        el.rotate = action.payload.rotate;
        state.isDirty = true;
      }
    },
    // Selection
    setSelectedElements(state, action: PayloadAction<string[]>) {
      state.selectedElementIds = action.payload;
    },
    clearSelection(state) {
      state.selectedElementIds = [];
    },
    // Pages
    addPage(state, action: PayloadAction<Omit<Page, 'id' | 'order'>>) {
      pushHistory(state);
      const newPage: Page = {
        ...action.payload,
        id: nanoid(),
        order: state.pages.length,
      };
      // Auto-copy page-number elements from the first page onto the new page
      const firstPage = [...state.pages].sort((a, b) => a.order - b.order)[0];
      if (firstPage) {
        const pageNums = Object.values(state.elements).filter(
          el => el.type === 'page-number' && el.pageId === firstPage.id
        );
        for (const el of pageNums) {
          const copy: CanvasElement = { ...el, id: nanoid(), pageId: newPage.id };
          state.elements[copy.id] = copy;
        }
      }
      state.pages.push(newPage);
      state.currentPageId = newPage.id;
      state.isDirty = true;
    },
    removePage(state, action: PayloadAction<string>) {
      if (state.pages.length <= 1) return;
      pushHistory(state);
      state.pages = state.pages.filter(p => p.id !== action.payload);
      // Remove elements on this page
      for (const id of Object.keys(state.elements)) {
        if (state.elements[id].pageId === action.payload) {
          delete state.elements[id];
        }
      }
      // Reorder
      state.pages.forEach((p, i) => { p.order = i; });
      if (state.currentPageId === action.payload) {
        state.currentPageId = state.pages[0].id;
      }
      state.isDirty = true;
    },
    duplicatePage(state, action: PayloadAction<string>) {
      pushHistory(state);
      const page = state.pages.find(p => p.id === action.payload);
      if (!page) return;
      const newPageId = nanoid();
      const newPage: Page = { ...page, id: newPageId, name: page.name + ' Copy', order: state.pages.length };
      state.pages.push(newPage);
      // Duplicate elements
      const pageElements = Object.values(state.elements).filter(e => e.pageId === action.payload);
      for (const el of pageElements) {
        const newEl = { ...JSON.parse(JSON.stringify(el)), id: nanoid(), pageId: newPageId };
        state.elements[newEl.id] = newEl;
      }
      state.currentPageId = newPageId;
      state.isDirty = true;
    },
    reorderPages(state, action: PayloadAction<{ pageId: string; direction: 'up' | 'down' }>) {
      pushHistory(state);
      const idx = state.pages.findIndex(p => p.id === action.payload.pageId);
      if (idx < 0) return;
      const targetIdx = action.payload.direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= state.pages.length) return;
      [state.pages[idx], state.pages[targetIdx]] = [state.pages[targetIdx], state.pages[idx]];
      state.pages.forEach((p, i) => { p.order = i; });
      state.isDirty = true;
    },
    updatePage(state, action: PayloadAction<{ id: string; changes: Partial<Page> }>) {
      const page = state.pages.find(p => p.id === action.payload.id);
      if (page) {
        Object.assign(page, action.payload.changes);
        state.isDirty = true;
      }
    },
    setCurrentPage(state, action: PayloadAction<string>) {
      state.currentPageId = action.payload;
      state.selectedElementIds = [];
    },
    // UI
    setZoom(state, action: PayloadAction<number>) {
      state.zoom = Math.min(2, Math.max(0.25, action.payload));
    },
    setTemplateName(state, action: PayloadAction<string>) {
      state.templateName = action.payload;
      state.isDirty = true;
    },
    setShowGrid(state, action: PayloadAction<boolean>) {
      state.showGrid = action.payload;
    },
    // Undo/Redo
    undo(state) {
      const prev = state.history.past.pop();
      if (!prev) return;
      state.history.future.unshift(snapshot(state));
      state.pages = prev.pages;
      state.elements = prev.elements;
      state.selectedElementIds = [];
    },
    redo(state) {
      const next = state.history.future.shift();
      if (!next) return;
      state.history.past.push(snapshot(state));
      state.pages = next.pages;
      state.elements = next.elements;
      state.selectedElementIds = [];
    },
    // Template
    loadTemplateState(state, action: PayloadAction<{ pages: Page[]; elements: Record<string, CanvasElement>; templateName: string }>) {
      state.pages = action.payload.pages;
      state.elements = action.payload.elements;
      state.templateName = action.payload.templateName;
      state.currentPageId = action.payload.pages[0]?.id ?? '';
      state.selectedElementIds = [];
      state.isDirty = false;
      state.history = { past: [], future: [] };
    },
    markSaved(state) {
      state.isDirty = false;
    },
    // Base PDF
    setBasePdf(state, action: PayloadAction<BasePdfState & { syncPages: boolean }>) {
      const { syncPages, ...basePdf } = action.payload;
      state.basePdf = basePdf;
      if (syncPages) {
        // Replace pages to match the base PDF's dimensions and page count
        const newPages: Page[] = basePdf.pageDimensions.map((dim, i) => ({
          id: nanoid(),
          name: `Page ${i + 1}`,
          width: dim.width,
          height: dim.height,
          order: i,
          backgroundColor: '#ffffff',
        }));
        state.pages = newPages;
        state.currentPageId = newPages[0]?.id ?? '';
        state.elements = {};
        state.selectedElementIds = [];
        state.history = { past: [], future: [] };
        state.isDirty = true;
      }
    },
    clearBasePdf(state) {
      state.basePdf = null;
    },
    // Z-index
    reorderElements(state, action: PayloadAction<{ id: string; direction: 'forward' | 'backward' | 'front' | 'back' }>) {
      const el = state.elements[action.payload.id];
      if (!el) return;
      const pageEls = Object.values(state.elements)
        .filter(e => e.pageId === el.pageId)
        .sort((a, b) => a.zIndex - b.zIndex);
      const idx = pageEls.findIndex(e => e.id === el.id);
      if (action.payload.direction === 'front') {
        pageEls.splice(idx, 1);
        pageEls.push(el);
      } else if (action.payload.direction === 'back') {
        pageEls.splice(idx, 1);
        pageEls.unshift(el);
      } else if (action.payload.direction === 'forward' && idx < pageEls.length - 1) {
        [pageEls[idx], pageEls[idx + 1]] = [pageEls[idx + 1], pageEls[idx]];
      } else if (action.payload.direction === 'backward' && idx > 0) {
        [pageEls[idx], pageEls[idx - 1]] = [pageEls[idx - 1], pageEls[idx]];
      }
      pageEls.forEach((e, i) => { state.elements[e.id].zIndex = i; });
      state.isDirty = true;
    },
    addElementsBatch(state, action: PayloadAction<CanvasElement[]>) {
      if (action.payload.length === 0) return;
      pushHistory(state);
      for (const el of action.payload) {
        state.elements[el.id] = el;
      }
      state.isDirty = true;
    },
    alignElements(state, action: PayloadAction<{ ids: string[]; alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }>) {
      if (action.payload.ids.length < 2) return;
      pushHistory(state);
      const els = action.payload.ids.map(id => state.elements[id]).filter(Boolean);
      if (els.length < 2) return;
      const minX = Math.min(...els.map(e => e.position.x));
      const maxX = Math.max(...els.map(e => e.position.x + e.width));
      const minY = Math.min(...els.map(e => e.position.y));
      const maxY = Math.max(...els.map(e => e.position.y + e.height));
      for (const el of els) {
        switch (action.payload.alignment) {
          case 'left': el.position.x = minX; break;
          case 'right': el.position.x = maxX - el.width; break;
          case 'center': el.position.x = (minX + maxX) / 2 - el.width / 2; break;
          case 'top': el.position.y = minY; break;
          case 'bottom': el.position.y = maxY - el.height; break;
          case 'middle': el.position.y = (minY + maxY) / 2 - el.height / 2; break;
        }
      }
      state.isDirty = true;
    },
  },
});

export const {
  addElement, addPageNumberToAllPages,
  updateElement, deleteElement, deleteSelectedElements,
  duplicateElement, duplicateSelectedElements,
  moveElement, resizeElement, rotateElement,
  setSelectedElements, clearSelection,
  addPage, removePage, duplicatePage, reorderPages, updatePage, setCurrentPage,
  setZoom, setTemplateName, setShowGrid,
  undo, redo,
  loadTemplateState, markSaved,
  addElementsBatch,
  reorderElements, alignElements,
  setBasePdf, clearBasePdf,
} = slice.actions;

export default slice.reducer;
