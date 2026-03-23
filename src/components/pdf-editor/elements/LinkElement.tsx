import React from 'react';
import type { LinkElement as LinkElementType } from '@/store/pdf-editor/types/elements';

interface Props {
  element: LinkElementType;
}

export const LinkElement = React.memo(({ element: el }: Props) => {
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    color: el.fontColor,
    textAlign: el.textAlign,
    textDecoration: 'underline',
    padding: el.padding,
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  };

  return <div style={style}>{el.label || el.url}</div>;
});
LinkElement.displayName = 'LinkElement';
