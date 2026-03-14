import React from 'react';
import type { CheckboxElement as CheckboxElementType } from '@/store/pdf-editor/types/elements';

interface Props { element: CheckboxElementType }

export const CheckboxElement = React.memo(({ element: el }: Props) => {
  const size = Math.min(el.width, el.height);
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: el.fillColor,
        border: `${el.strokeWidth}px solid ${el.strokeColor}`,
        borderRadius: el.cornerRadius,
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {el.checked && (
        <svg
          viewBox="0 0 12 12"
          style={{ position: 'absolute', inset: 2, width: 'calc(100% - 4px)', height: 'calc(100% - 4px)' }}
        >
          {el.checkStyle === 'check' && (
            <polyline
              points="1,6 4,10 11,2"
              fill="none"
              stroke={el.checkColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {el.checkStyle === 'cross' && (
            <>
              <line x1="1" y1="1" x2="11" y2="11" stroke={el.checkColor} strokeWidth="2" strokeLinecap="round" />
              <line x1="11" y1="1" x2="1" y2="11" stroke={el.checkColor} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          {el.checkStyle === 'filled' && (
            <rect x="0" y="0" width="12" height="12" fill={el.checkColor} />
          )}
        </svg>
      )}
    </div>
  );
});
CheckboxElement.displayName = 'CheckboxElement';