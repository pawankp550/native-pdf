import React from 'react';
import type { BulletListElement as BulletListElementType } from '@/store/pdf-editor/types/elements';

interface Props { element: BulletListElementType }

const BULLET_CHARS: Record<string, string> = {
  disc: '•',
  circle: '◦',
  square: '▪',
  none: '',
};

export const BulletListElement = React.memo(({ element: el }: Props) => (
  <div style={{
    width: '100%',
    height: '100%',
    background: el.backgroundColor,
    padding: el.padding,
    overflow: 'hidden',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: el.gap,
  }}>
    {el.items.map((item, i) => (
      <div key={i} style={{
        display: 'flex',
        alignItems: 'flex-start',
        fontSize: el.fontSize,
        fontFamily: `${el.fontFamily}, Helvetica, sans-serif`,
        color: el.fontColor,
        fontWeight: el.fontWeight,
        lineHeight: el.lineHeight,
      }}>
        <span style={{
          color: el.bulletColor,
          width: el.indentSize,
          minWidth: el.indentSize,
          flexShrink: 0,
          paddingTop: '0.05em',
          textAlign: 'center',
        }}>
          {el.bulletStyle === 'decimal' ? `${i + 1}.` : BULLET_CHARS[el.bulletStyle]}
        </span>
        <span style={{ flex: 1, wordBreak: 'break-word' }}>{item}</span>
      </div>
    ))}
  </div>
));
BulletListElement.displayName = 'BulletListElement';
