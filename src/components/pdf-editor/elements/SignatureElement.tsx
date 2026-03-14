import React from 'react';
import type { SignatureElement as SignatureElementType } from '@/store/pdf-editor/types/elements';

interface Props { element: SignatureElementType }

export const SignatureElement = React.memo(({ element: el }: Props) => {
  if (el.style === 'box') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `${el.lineWidth}px solid ${el.lineColor}`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'flex-end',
          padding: 4,
          position: 'relative',
        }}
      >
        <span style={{ fontSize: el.labelFontSize, color: el.lineColor, position: 'absolute', top: 4, left: 4 }}>
          {el.label}
        </span>
      </div>
    );
  }

  if (el.style === 'formal') {
    const sections = ['Signature', 'Printed Name', ...(el.showDate ? ['Date'] : [])];
    void (el.height / sections.length); // sectionHeight used for layout via flex
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {sections.map((sec, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ borderBottom: `${el.lineWidth}px solid ${el.lineColor}`, marginBottom: 2 }} />
            <span style={{ fontSize: el.labelFontSize, color: el.lineColor }}>{sec}</span>
          </div>
        ))}
      </div>
    );
  }

  // line-only
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ borderBottom: `${el.lineWidth}px solid ${el.lineColor}`, marginBottom: 2 }} />
      <span style={{ fontSize: el.labelFontSize, color: el.lineColor }}>{el.label}</span>
    </div>
  );
});
SignatureElement.displayName = 'SignatureElement';
