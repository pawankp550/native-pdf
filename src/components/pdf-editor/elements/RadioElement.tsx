import React from 'react';
import type { RadioElement as RadioElementType } from '@/store/pdf-editor/types/elements';

interface Props { element: RadioElementType }

export const RadioElement = React.memo(({ element: el }: Props) => {
  const circleSize = el.height;
  const innerSize = circleSize * 0.44;

  const circle = (
    <div style={{
      width: circleSize,
      height: circleSize,
      borderRadius: '50%',
      border: `${el.strokeWidth}px solid ${el.strokeColor}`,
      backgroundColor: el.fillColor,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    }}>
      {el.checked && (
        <div style={{
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          backgroundColor: el.checkColor,
        }} />
      )}
    </div>
  );

  const label = el.label ? (
    <span style={{
      fontSize: el.labelFontSize,
      color: el.labelColor,
      lineHeight: 1.2,
      userSelect: 'none',
    }}>
      {el.label}
    </span>
  ) : null;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: el.labelPosition === 'left' ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
    }}>
      {circle}
      {label}
    </div>
  );
});
RadioElement.displayName = 'RadioElement';
