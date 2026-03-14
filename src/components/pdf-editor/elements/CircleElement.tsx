import React from 'react';
import type { CircleElement as CircleElementType } from '@/store/pdf-editor/types/elements';

interface Props { element: CircleElementType }

export const CircleElement = React.memo(({ element: el }: Props) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: el.transparent ? 'transparent' : el.fillColor,
      opacity: el.transparent ? 1 : el.fillOpacity,
      border: el.strokeWidth > 0 ? `${el.strokeWidth}px solid ${el.strokeColor}` : 'none',
      borderRadius: '50%',
      boxSizing: 'border-box',
    }}
  />
));
CircleElement.displayName = 'CircleElement';