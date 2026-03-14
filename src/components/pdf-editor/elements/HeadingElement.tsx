import React, { useRef, useEffect } from 'react';
import type { HeadingElement as HeadingElementType } from '@/store/pdf-editor/types/elements';

interface Props {
  element: HeadingElementType;
  isEditing: boolean;
  onCommitText: (text: string) => void;
}

export const HeadingElement = React.memo(({ element: el, isEditing, onCommitText }: Props) => {
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const vAlignMap: Record<string, string> = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };

  const wrapStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: vAlignMap[el.verticalAlign] ?? 'flex-start',
    backgroundColor: el.backgroundColor === 'transparent' ? 'transparent' : el.backgroundColor,
    padding: el.padding,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  const textStyle: React.CSSProperties = {
    width: '100%',
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    fontWeight: 'bold',
    color: el.fontColor,
    textAlign: el.textAlign,
    textDecoration: el.underline ? 'underline' : 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.2,
  };

  if (isEditing) {
    return (
      <div style={wrapStyle}>
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          style={{ ...textStyle, outline: 'none', cursor: 'text', width: '100%' }}
          onBlur={e => onCommitText(e.currentTarget.innerText)}
          onKeyDown={e => {
            if (e.key === 'Escape') e.currentTarget.blur();
            e.stopPropagation();
          }}
          dangerouslySetInnerHTML={{ __html: el.content.replace(/\n/g, '<br>') }}
        />
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={textStyle}>{el.content}</div>
    </div>
  );
});
HeadingElement.displayName = 'HeadingElement';
