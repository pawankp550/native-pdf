import React from 'react';
import type { LineElement as LineElementType } from '@/store/pdf-editor/types/elements';

interface Props { element: LineElementType }

export const LineElement = React.memo(({ element: el }: Props) => (
  <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
    <line
      x1="0"
      y1={el.height / 2}
      x2={el.width}
      y2={el.height / 2}
      stroke={el.strokeColor}
      strokeWidth={el.strokeWidth}
      strokeDasharray={el.dashArray.join(',')}
      strokeLinecap={el.lineCap}
    />
  </svg>
));
LineElement.displayName = 'LineElement';