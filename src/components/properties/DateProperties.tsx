import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { DateElement } from '@/store/pdf-editor/types/elements';
import { FONT_FAMILIES } from '@/constants/fonts';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';
import { formatDate, parseIsoDate, todayIso } from '@/utils/date-format';

interface Props { element: DateElement }

const PRESETS = [
  { label: 'MM/DD/YYYY',       value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY',       value: 'DD/MM/YYYY' },
  { label: 'YYYY-MM-DD',       value: 'YYYY-MM-DD' },
  { label: 'MMMM DD, YYYY',    value: 'MMMM DD, YYYY' },
  { label: 'MMM DD, YYYY',     value: 'MMM DD, YYYY' },
  { label: 'DD MMMM YYYY',     value: 'DD MMMM YYYY' },
  { label: 'ddd, MMM DD YYYY', value: 'ddd, MMM DD YYYY' },
  { label: 'dddd, MMMM D',     value: 'dddd, MMMM D' },
  { label: 'M/D/YY',           value: 'M/D/YY' },
];

export const DateProperties = React.memo(({ element: el }: Props) => {
  const dispatch = useAppDispatch();
  const update = (changes: Partial<DateElement>) =>
    dispatch(updateElement({ id: el.id, changes: changes as never }));

  const previewDate = el.dateSource === 'fixed' && el.fixedDate
    ? parseIsoDate(el.fixedDate)
    : new Date();
  const preview = el.format ? formatDate(previewDate, el.format) : '—';

  const isPreset = PRESETS.some(p => p.value === el.format);

  return (
    <AccordionItem value="style">
      <AccordionTrigger className="text-xs font-medium py-2">Date</AccordionTrigger>
      <AccordionContent className="space-y-3 pb-3">

        {/* Date source */}
        <div>
          <Label>Date Source</Label>
          <Select value={el.dateSource} onValueChange={v => update({ dateSource: v as DateElement['dateSource'] })}>
            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today (dynamic)</SelectItem>
              <SelectItem value="fixed">Fixed date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {el.dateSource === 'fixed' && (
          <div>
            <Label>Fixed Date</Label>
            <Input
              type="date"
              value={el.fixedDate || todayIso()}
              onChange={e => update({ fixedDate: e.target.value })}
              className="mt-0.5 h-7 text-xs"
            />
          </div>
        )}

        {/* Format preset */}
        <div>
          <Label>Format Preset</Label>
          <Select
            value={isPreset ? el.format : '__custom__'}
            onValueChange={v => { if (v !== '__custom__') update({ format: v }); }}
          >
            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRESETS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
              <SelectItem value="__custom__">Custom…</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom format */}
        <div>
          <Label>Format String</Label>
          <Input
            value={el.format}
            onChange={e => update({ format: e.target.value })}
            className="mt-0.5 h-7 text-xs"
            placeholder="MMMM DD, YYYY"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
            Tokens: <code className="bg-muted px-0.5 rounded">YYYY YY</code>{' '}
            <code className="bg-muted px-0.5 rounded">MMMM MMM MM M</code>{' '}
            <code className="bg-muted px-0.5 rounded">DD D</code>{' '}
            <code className="bg-muted px-0.5 rounded">dddd ddd</code>
          </p>
        </div>

        {/* Live preview */}
        <div className="rounded border border-border bg-muted/40 px-3 py-1.5 text-xs text-center font-medium">
          {preview}
        </div>

        {/* Font */}
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Font Size" value={el.fontSize} min={6} max={72} onChange={v => update({ fontSize: v })} />
          <div>
            <Label>Weight</Label>
            <Select value={el.fontWeight} onValueChange={v => update({ fontWeight: v as 'normal' | 'bold' })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Font Family</Label>
          <Select value={el.fontFamily} onValueChange={v => update({ fontFamily: v as DateElement['fontFamily'] })}>
            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Alignment</Label>
          <Select value={el.textAlign} onValueChange={v => update({ textAlign: v as 'left' | 'center' | 'right' })}>
            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ColorPicker label="Text Color" value={el.fontColor} onChange={v => update({ fontColor: v })} />
        <ColorPicker
          label="Background"
          value={el.backgroundColor === 'transparent' ? '#ffffff' : el.backgroundColor}
          onChange={v => update({ backgroundColor: v })}
        />
        <NumberInput label="Padding" value={el.padding} min={0} max={20} onChange={v => update({ padding: v })} />

      </AccordionContent>
    </AccordionItem>
  );
});
DateProperties.displayName = 'DateProperties';
