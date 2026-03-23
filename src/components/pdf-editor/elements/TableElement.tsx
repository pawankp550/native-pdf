import React, { useRef, useEffect, useState } from 'react';
import type { TableElement as TableElementType, TableColumn } from '@/store/pdf-editor/types/elements';

interface Props {
  element: TableElementType;
  isEditing: boolean;
  onCommitTable: (data: string[][], columns: TableColumn[], width: number) => void;
}

export const TableElement = React.memo(({ element: el, isEditing, onCommitTable }: Props) => {
  const pendingDataRef = useRef<string[][]>(el.data.map(r => [...r]));
  const pendingColumnsRef = useRef<TableColumn[]>(el.columns.map(c => ({ ...c })));

  const [colWidths, setColWidths] = useState<number[]>(() => el.columns.map(c => c.width));
  const colWidthsRef = useRef<number[]>(el.columns.map(c => c.width));
  const resizingRef = useRef<{ ci: number; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (isEditing) {
      pendingDataRef.current = el.data.map(r => [...r]);
      pendingColumnsRef.current = el.columns.map(c => ({ ...c }));
    }
    const widths = el.columns.map(c => c.width);
    colWidthsRef.current = widths;
    setColWidths(widths);
  }, [isEditing, el.data, el.columns]);

  const handleResizeMouseDown = (e: React.MouseEvent, ci: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { ci, startX: e.clientX, startWidth: colWidthsRef.current[ci] };

    const onMouseMove = (me: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = me.clientX - resizingRef.current.startX;
      const newWidth = Math.max(20, resizingRef.current.startWidth + delta);
      const next = [...colWidthsRef.current];
      next[resizingRef.current.ci] = newWidth;
      colWidthsRef.current = next;
      setColWidths([...next]);
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      pendingColumnsRef.current = pendingColumnsRef.current.map((c, i) => ({
        ...c,
        width: colWidthsRef.current[i] ?? c.width,
      }));
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const headerHeight = el.rowHeights[0] ?? 24;

  const baseCellStyle: React.CSSProperties = {
    padding: '2px 4px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };

  if (isEditing) {
    return (
      <div
        style={{ width: '100%', height: '100%', overflow: 'hidden', fontSize: 12 }}
        onBlur={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            const totalWidth = colWidthsRef.current.reduce((s, w) => s + w, 0) + el.borderWidth;
            onCommitTable(pendingDataRef.current, pendingColumnsRef.current, totalWidth);
          }
        }}
      >
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          {el.showHeader && (
            <thead>
              <tr style={{ height: headerHeight }}>
                {el.columns.map((col, ci) => (
                  <th
                    key={col.id}
                    contentEditable
                    suppressContentEditableWarning
                    style={{
                      ...baseCellStyle,
                      position: 'relative',
                      width: colWidths[ci],
                      backgroundColor: el.headerStyle.bg,
                      color: el.headerStyle.textColor,
                      fontSize: el.headerStyle.fontSize,
                      fontWeight: el.headerStyle.fontWeight,
                      border: `${el.borderWidth}px solid ${el.borderColor}`,
                      textAlign: el.headerStyle.textAlign,
                      verticalAlign: el.headerStyle.verticalAlign,
                      outline: 'none',
                      cursor: 'text',
                    }}
                    onInput={e => {
                      const updated = pendingColumnsRef.current.map(c => ({ ...c }));
                      updated[ci] = { ...updated[ci], label: e.currentTarget.innerText };
                      pendingColumnsRef.current = updated;
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                      e.stopPropagation();
                    }}
                    dangerouslySetInnerHTML={{ __html: col.label }}
                  >
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {el.data.map((row, ri) => {
              const rowHeight = el.rowHeights[(el.showHeader ? ri + 1 : ri)] ?? 20;
              return (
                <tr key={ri} style={{ height: rowHeight }}>
                  {el.columns.map((col, ci) => (
                    <td
                      key={col.id}
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        ...baseCellStyle,
                        width: colWidths[ci],
                        backgroundColor: el.bodyStyle.bg,
                        color: el.bodyStyle.textColor,
                        fontSize: el.bodyStyle.fontSize,
                        border: `${el.borderWidth}px solid ${el.borderColor}`,
                        textAlign: el.bodyStyle.textAlign,
                        verticalAlign: el.bodyStyle.verticalAlign,
                        outline: 'none',
                        cursor: 'text',
                      }}
                      onInput={e => {
                        const updated = pendingDataRef.current.map(r => [...r]);
                        updated[ri][ci] = e.currentTarget.innerText;
                        pendingDataRef.current = updated;
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Escape') { e.currentTarget.blur(); }
                        e.stopPropagation();
                      }}
                      dangerouslySetInnerHTML={{ __html: row[ci] ?? '' }}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {el.showHeader && (
          <div style={{ position: 'absolute', top: 0, left: 0, height: headerHeight, pointerEvents: 'none', display: 'flex' }}>
            {el.columns.map((col, ci) => {
              const offsetLeft = colWidths.slice(0, ci + 1).reduce((s, w) => s + w, 0);
              return ci < el.columns.length - 1 ? (
                <div
                  key={col.id}
                  style={{
                    position: 'absolute',
                    left: offsetLeft - 3,
                    top: 0,
                    width: 6,
                    height: headerHeight,
                    cursor: 'col-resize',
                    pointerEvents: 'all',
                    zIndex: 10,
                  }}
                  onMouseDown={e => handleResizeMouseDown(e, ci)}
                />
              ) : null;
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', fontSize: 12 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        {el.showHeader && (
          <thead>
            <tr style={{ height: headerHeight }}>
              {el.columns.map((col, ci) => (
                <th
                  key={col.id}
                  style={{
                    width: colWidths[ci],
                    backgroundColor: el.headerStyle.bg,
                    color: el.headerStyle.textColor,
                    fontSize: el.headerStyle.fontSize,
                    fontWeight: el.headerStyle.fontWeight,
                    border: `${el.borderWidth}px solid ${el.borderColor}`,
                    padding: '2px 4px',
                    textAlign: el.headerStyle.textAlign,
                    verticalAlign: el.headerStyle.verticalAlign,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {el.data.map((row, ri) => {
            const rowHeight = el.rowHeights[(el.showHeader ? ri + 1 : ri)] ?? 20;
            return (
              <tr key={ri} style={{ height: rowHeight }}>
                {el.columns.map((col, ci) => (
                  <td
                    key={col.id}
                    style={{
                      width: colWidths[ci],
                      backgroundColor: el.bodyStyle.bg,
                      color: el.bodyStyle.textColor,
                      fontSize: el.bodyStyle.fontSize,
                      border: `${el.borderWidth}px solid ${el.borderColor}`,
                      padding: '2px 4px',
                      textAlign: el.bodyStyle.textAlign,
                      verticalAlign: el.bodyStyle.verticalAlign,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row[ci] ?? ''}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
TableElement.displayName = 'TableElement';