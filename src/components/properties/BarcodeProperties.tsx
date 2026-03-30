import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { BarcodeElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: BarcodeElement }

const FORMATS: { value: BarcodeElement['format']; label: string; hint: string }[] = [
  { value: 'CODE128', label: 'Code 128',  hint: 'Any ASCII text' },
  { value: 'CODE39',  label: 'Code 39',   hint: 'A-Z, 0-9, - . $ / + % space' },
  { value: 'EAN13',   label: 'EAN-13',    hint: '12 or 13 digits' },
  { value: 'EAN8',    label: 'EAN-8',     hint: '7 or 8 digits' },
  { value: 'UPC',     label: 'UPC-A',     hint: '11 or 12 digits' },
];

export const BarcodeProperties = React.memo(({ element: el }: Props) => {
  const dispatch = useAppDispatch();
  const update = (changes: Partial<BarcodeElement>) =>
    dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

  const fmt = FORMATS.find(f => f.value === el.format);

  return (
    <AccordionItem value="style">
      <AccordionTrigger>Barcode</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2.5">
          <div>
            <Label>Value</Label>
            <Input
              className="mt-0.5 h-7 text-xs font-mono"
              placeholder={fmt?.hint ?? ''}
              value={el.value}
              onChange={e => update({ value: e.target.value })}
            />
            {fmt && <p className="text-[10px] text-muted-foreground mt-0.5">{fmt.hint}</p>}
          </div>

          <div>
            <Label>Format</Label>
            <Select value={el.format} onValueChange={v => update({ format: v as BarcodeElement['format'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Show Text</Label>
            <Switch checked={el.displayValue} onCheckedChange={v => update({ displayValue: v })} />
          </div>

          {el.displayValue && (
            <NumberInput label="Font Size" value={el.fontSize} min={6} max={24} onChange={v => update({ fontSize: v })} />
          )}

          <NumberInput label="Margin" value={el.margin} min={0} max={20} onChange={v => update({ margin: v })} />
          <ColorPicker label="Bar Color"        value={el.lineColor}  onChange={v => update({ lineColor: v })} />
          <ColorPicker label="Background Color" value={el.background} onChange={v => update({ background: v })} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});
BarcodeProperties.displayName = 'BarcodeProperties';
