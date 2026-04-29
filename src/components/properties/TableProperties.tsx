import React from 'react';
import { nanoid } from '@reduxjs/toolkit';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { TableElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: TableElement }

export const TableProperties = React.memo(({ element: el }: Props) => {
  const dispatch = useAppDispatch();
  const update = (changes: Partial<TableElement>) =>
    dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

  const addRow = () => {
    const newRow = new Array(el.columns.length).fill('');
    const newData = [...el.data, newRow];
    const newRowHeights = [...el.rowHeights, 24];
    update({ data: newData, rowHeights: newRowHeights, height: el.height + 24 });
  };

  const removeRow = () => {
    if (el.data.length <= 1) return;
    const newData = el.data.slice(0, -1);
    const lastRowHeight = el.rowHeights[el.rowHeights.length - 1] ?? 24;
    const newRowHeights = el.rowHeights.slice(0, -1);
    update({ data: newData, rowHeights: newRowHeights, height: Math.max(40, el.height - lastRowHeight) });
  };

  const addColumn = () => {
    const newCol = { id: nanoid(), label: `Column ${el.columns.length + 1}`, width: 100 };
    const newColumns = [...el.columns, newCol];
    const newData = el.data.map(row => [...row, '']);
    update({ columns: newColumns, data: newData, width: el.width + 100 });
  };

  const removeColumn = () => {
    if (el.columns.length <= 1) return;
    const lastCol = el.columns[el.columns.length - 1];
    const newColumns = el.columns.slice(0, -1);
    const newData = el.data.map(row => row.slice(0, -1));
    update({ columns: newColumns, data: newData, width: Math.max(60, el.width - lastCol.width) });
  };

  return (
    <AccordionItem value="style">
      <AccordionTrigger>Table Style</AccordionTrigger>
      <AccordionContent className='overflow-auto'>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Rows</Label>
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={addRow}>+ Add Row</Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={removeRow} disabled={el.data.length <= 1}>− Remove</Button>
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Columns</Label>
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={addColumn}>+ Add Col</Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={removeColumn} disabled={el.columns.length <= 1}>− Remove</Button>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground">
            {el.data.length} rows × {el.columns.length} cols
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Column Widths</Label>
            <div className="space-y-1 mt-1">
              {el.columns.map((col, ci) => (
                <div key={col.id} className="flex items-center gap-2">
                  <span className="text-xs truncate flex-1 min-w-0 text-muted-foreground">{col.label || `Col ${ci + 1}`}</span>
                  <NumberInput
                    value={col.width}
                    min={20}
                    max={800}
                    onChange={v => {
                      const newColumns = el.columns.map((c, i) => i === ci ? { ...c, width: v } : c);
                      const totalWidth = newColumns.reduce((s, c) => s + c.width, 0) + el.borderWidth;
                      update({ columns: newColumns, width: totalWidth });
                    }}
                    className="w-24 shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>

          <ColorPicker label="Border Color" value={el.borderColor} onChange={v => update({ borderColor: v })} />
          <NumberInput label="Border Width" value={el.borderWidth} min={0} max={10} onChange={v => update({ borderWidth: v })} />

          <div className="flex items-center justify-between">
            <Label>Show Header</Label>
            <Switch checked={el.showHeader} onCheckedChange={v => update({ showHeader: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Repeat Header on Page Break</Label>
            <Switch checked={el.repeatHeaderOnPageBreak} onCheckedChange={v => update({ repeatHeaderOnPageBreak: v })} />
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Header</Label>
            <div className="space-y-1.5 mt-1">
              <ColorPicker label="Background" value={el.headerStyle.bg} onChange={v => update({ headerStyle: { ...el.headerStyle, bg: v } })} />
              <ColorPicker label="Text Color" value={el.headerStyle.textColor} onChange={v => update({ headerStyle: { ...el.headerStyle, textColor: v } })} />
              <NumberInput label="Font Size" value={el.headerStyle.fontSize} min={6} max={36} onChange={v => update({ headerStyle: { ...el.headerStyle, fontSize: v } })} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Align</Label>
                  <Select value={el.headerStyle.textAlign} onValueChange={v => update({ headerStyle: { ...el.headerStyle, textAlign: v as 'left' | 'center' | 'right' } })}>
                    <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vertical</Label>
                  <Select value={el.headerStyle.verticalAlign} onValueChange={v => update({ headerStyle: { ...el.headerStyle, verticalAlign: v as 'top' | 'middle' | 'bottom' } })}>
                    <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Body</Label>
            <div className="space-y-1.5 mt-1">
              <ColorPicker label="Background" value={el.bodyStyle.bg} onChange={v => update({ bodyStyle: { ...el.bodyStyle, bg: v } })} />
              <ColorPicker label="Text Color" value={el.bodyStyle.textColor} onChange={v => update({ bodyStyle: { ...el.bodyStyle, textColor: v } })} />
              <NumberInput label="Font Size" value={el.bodyStyle.fontSize} min={6} max={36} onChange={v => update({ bodyStyle: { ...el.bodyStyle, fontSize: v } })} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Align</Label>
                  <Select value={el.bodyStyle.textAlign} onValueChange={v => update({ bodyStyle: { ...el.bodyStyle, textAlign: v as 'left' | 'center' | 'right' } })}>
                    <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vertical</Label>
                  <Select value={el.bodyStyle.verticalAlign} onValueChange={v => update({ bodyStyle: { ...el.bodyStyle, verticalAlign: v as 'top' | 'middle' | 'bottom' } })}>
                    <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Top</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});
TableProperties.displayName = 'TableProperties';
