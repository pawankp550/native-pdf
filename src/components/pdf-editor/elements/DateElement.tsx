import React from 'react';
import type { DateElement as DateElementType } from '@/store/pdf-editor/types/elements';
import { formatDate, parseIsoDate } from '@/utils/date-format';

interface Props { element: DateElementType }

export const DateElement = React.memo(({ element: el }: Props) => {
  const date = el.dateSource === 'fixed' && el.fixedDate
    ? parseIsoDate(el.fixedDate)
    : new Date();

  const text = el.format ? formatDate(date, el.format) : '';

  const alignMap: Record<string, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: alignMap[el.textAlign] ?? 'flex-start',
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
DateElement.displayName = 'DateElement';