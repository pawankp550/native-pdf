import React from 'react';
import type { RectangleElement as RectangleElementType } from '@/store/pdf-editor/types/elements';

interface Props { element: RectangleElementType }

export const RectangleElement = React.memo(({ element: el }: Props) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: el.transparent ? 'transparent' : el.fillColor,
      opacity: el.transparent ? 1 : el.fillOpacity,
      border: el.strokeWidth > 0 ? `${el.strokeWidth}px solid ${el.strokeColor}` : 'none',
      borderRadius: el.cornerRadius,
      boxSizing: 'border-box',
    }}
  />
));
RectangleElement.displayName = 'RectangleElement';