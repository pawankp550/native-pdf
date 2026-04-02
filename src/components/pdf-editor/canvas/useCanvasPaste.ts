import { useEffect, useRef } from 'react';
import type { AppDispatch } from '@/store';
import { addElement, setSelectedElements } from '@/store/pdf-editor/slice';
import type { CanvasElement, TextElement, ImageElement, LinkElement } from '@/store/pdf-editor/types/elements';
import { createDefaultElement } from './createDefaultElement';

interface Page {
  id: string;
  width: number;
  height: number;
}

interface Params {
  currentPage: Page | null | undefined;
  elements: CanvasElement[];
  dispatch: AppDispatch;
  editingId: string | null;
}

const URL_RE = /^https?:\/\/.+/i;

export function useCanvasPaste({ currentPage, elements, dispatch, editingId }: Params) {
  const currentPageRef = useRef(currentPage);
  const elementsRef = useRef(elements);
  const editingIdRef = useRef(editingId);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { elementsRef.current = elements; }, [elements]);
  useEffect(() => { editingIdRef.current = editingId; }, [editingId]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editingIdRef.current) return;
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || active?.isContentEditable) return;

      const page = currentPageRef.current;
      if (!page) return;

      const items = Array.from(e.clipboardData?.items ?? []);
      const els = elementsRef.current;
      const maxZ = els.length > 0 ? Math.max(...els.map(ev => ev.zIndex)) + 1 : 0;

      const centerX = (el: { width: number }) => Math.round(page.width / 2 - el.width / 2);
      const centerY = (el: { height: number }) => Math.round(page.height / 2 - el.height / 2);

      // Image paste
      const imgItem = items.find(item => item.type.startsWith('image/'));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const el = createDefaultElement('image', 0, 0, page.id) as ImageElement;
            el.src = src;
            el.position.x = centerX(el);
            el.position.y = centerY(el);
            el.zIndex = maxZ;
            dispatch(addElement(el));
            dispatch(setSelectedElements([el.id]));
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      // Text / URL paste
      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (!text) return;
      e.preventDefault();

      // URL → link element
      if (URL_RE.test(text)) {
        const el = createDefaultElement('link', 0, 0, page.id) as LinkElement;
        el.url = text;
        el.label = text.length > 60 ? text.slice(0, 57) + '…' : text;
        el.position.x = centerX(el);
        el.position.y = centerY(el);
        el.zIndex = maxZ;
        dispatch(addElement(el));
        dispatch(setSelectedElements([el.id]));
        return;
      }

      // Plain text → text element, height grows with line count
      const el = createDefaultElement('text', 0, 0, page.id) as TextElement;
      el.content = text;
      const lineCount = text.split('\n').length;
      el.height = Math.max(40, Math.round(lineCount * el.fontSize * el.lineHeight + el.padding * 2));
      el.position.x = centerX(el);
      el.position.y = centerY(el);
      el.zIndex = maxZ;
      dispatch(addElement(el));
      dispatch(setSelectedElements([el.id]));
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [dispatch]); // stable ref — dispatch never changes after mount
}
