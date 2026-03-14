import React, { useRef, useEffect } from 'react';
import type { TableElement as TableElementType, TableColumn } from '@/store/pdf-editor/types/elements';

interface Props {
  element: TableElementType;
  isEditing: boolean;
  onCommitTable: (data: string[][], columns: TableColumn[]) => void;
}

export const TableElement = React.memo(({ element: el, isEditing, onCommitTable }: Props) => {
  const pendingDataRef = useRef<string[][]>(el.data.map(r => [...r]));
  const pendingColumnsRef = useRef<TableColumn[]>(el.columns.map(c => ({ ...c })));

  useEffect(() => {
    if (isEditing) {
      pendingDataRef.current = el.data.map(r => [...r]);
      pendingColumnsRef.current = el.columns.map(c => ({ ...c }));
    }
  }, [isEditing, el.data, el.columns]);

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
            onCommitTable(pendingDataRef.current, pendingColumnsRef.current);
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
                      width: col.width,
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
                  />
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
                        width: col.width,
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
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', fontSize: 12 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        {el.showHeader && (
          <thead>
            <tr style={{ height: headerHeight }}>
              {el.columns.map((col) => (
                <th
                  key={col.id}
                  style={{
                    width: col.width,
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
                      width: col.width,
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