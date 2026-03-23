import React, { useRef, useEffect } from 'react';
import type { TextElement as TextElementType } from '@/store/pdf-editor/types/elements';

interface Props {
  element: TextElementType;
  isEditing: boolean;
  onCommitText: (text: string) => void;
}

export const TextElement = React.memo(({ element: el, isEditing, onCommitText }: Props) => {
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

  const hasLink = !!el.url?.trim();
  const decorations = [
    el.underline && 'underline',
    el.strikethrough && 'line-through',
    hasLink && !el.underline && 'underline',
  ].filter(Boolean).join(' ') || 'none';

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    fontWeight: el.fontWeight,
    fontStyle: el.fontStyle,
    color: hasLink ? '#2563eb' : el.fontColor,
    textAlign: el.textAlign,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
    textTransform: el.textTransform !== 'none' ? el.textTransform : undefined,
    textDecoration: decorations,
    textDecorationColor: hasLink ? '#2563eb' : undefined,
    backgroundColor: el.backgroundColor === 'transparent' ? 'transparent' : el.backgroundColor,
    padding: el.padding,
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    boxSizing: 'border-box',
    cursor: hasLink ? 'pointer' : undefined,
  };

  if (isEditing) {
    return (
      <div
        ref={editRef}
        contentEditable
        suppressContentEditableWarning
        style={{ ...style, outline: 'none', cursor: 'text' }}
        onBlur={e => onCommitText(e.currentTarget.innerText)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.currentTarget.blur();
          }
          e.stopPropagation();
        }}
        dangerouslySetInnerHTML={{ __html: el.content.replace(/\n/g, '<br>') }}
      />
    );
  }

  return (
    <div style={style}>
      {el.content}
    </div>
  );
});
TextElement.displayName = 'TextElement';