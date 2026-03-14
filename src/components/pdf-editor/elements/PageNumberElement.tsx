import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectSortedPages } from '@/store/pdf-editor/selectors';
import type { PageNumberElement as PageNumberElementType } from '@/store/pdf-editor/types/elements';

interface Props {
  element: PageNumberElementType;
}

export const PageNumberElement = React.memo(({ element: el }: Props) => {
  const pages = useAppSelector(selectSortedPages);
  const pageIndex = pages.findIndex(p => p.id === el.pageId) + 1;
  const totalPages = pages.length;

  const text = el.format
    .replace(/\{n\}/g, String(pageIndex))
    .replace(/\{total\}/g, String(totalPages));

  const alignMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: alignMap[el.textAlign] ?? 'center',
        backgroundColor: el.backgroundColor === 'transparent' ? undefined : el.backgroundColor,
        padding: el.padding,
        boxSizing: 'border-box',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: el.fontSize,
          fontFamily: el.fontFamily === 'Times' ? 'serif' : el.fontFamily === 'Courier' ? 'monospace' : 'sans-serif',
          fontWeight: el.fontWeight,
          color: el.fontColor,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    </div>
  );
});
PageNumberElement.displayName = 'PageNumberElement';
