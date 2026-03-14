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
            // place cursor at end
            const range = document.createRange();
            range.selectNodeContents(editRef.current);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }, [isEditing]);

    const style: React.CSSProperties = {
        width: '100%',
        height: '100%',
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        fontWeight: el.fontWeight,
        fontStyle: el.fontStyle,
        color: el.fontColor,
        textAlign: el.textAlign,
        lineHeight: el.lineHeight,
        textDecoration: [el.underline && 'underline', el.strikethrough && 'line-through'].filter(Boolean).join(' ') || 'none',
        backgroundColor: el.backgroundColor === 'transparent' ? 'transparent' : el.backgroundColor,
        padding: el.padding,
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxSizing: 'border-box',
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