import { useEffect } from 'react';
import type { AppDispatch } from '@/store';
import {
  deleteSelectedElements, duplicateSelectedElements,
  moveElement, setSelectedElements, clearSelection,
  undo, redo,
} from '@/store/pdf-editor/slice';
import type { CanvasElement } from '@/store/pdf-editor/types/elements';

interface Params {
  selectedIds: string[];
  elements: CanvasElement[];
  dispatch: AppDispatch;
  onEscape?: () => void;
}

export function useCanvasKeyboard({ selectedIds, elements, dispatch, onEscape }: Params) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) { e.preventDefault(); dispatch(deleteSelectedElements()); }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault(); dispatch(duplicateSelectedElements());
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault(); dispatch(undo());
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault(); dispatch(redo());
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        dispatch(setSelectedElements(elements.map(el => el.id)));
      } else if (e.key === 'Escape') {
        dispatch(clearSelection());
        onEscape?.();
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        for (const id of selectedIds) {
          const el = elements.find(e => e.id === id);
          if (!el || el.locked) continue;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          dispatch(moveElement({ id, x: el.position.x + dx, y: el.position.y + dy }));
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, elements, dispatch, onEscape]);
}
