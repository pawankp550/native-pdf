import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { HeadingElement } from '@/store/pdf-editor/types/elements';
import { FONT_FAMILIES } from '@/constants/fonts';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: HeadingElement }

const LEVEL_SIZES: Record<number, number> = { 1: 32, 2: 26, 3: 22, 4: 18, 5: 16, 6: 14 };
const LEVELS = [1, 2, 3, 4, 5, 6] as const;

export const HeadingProperties = React.memo(({ element: el }: Props) => {
  const dispatch = useAppDispatch();
  const update = (changes: Partial<HeadingElement>) =>
    dispatch(updateElement({ id: el.id, changes: changes as never }));

  return (
    <AccordionItem value="style">
      <AccordionTrigger className="text-xs font-medium py-2">Heading</AccordionTrigger>
      <AccordionContent className="space-y-3 pb-3">

        {/* Level picker */}
        <div>
          <Label>Level</Label>
          <div className="flex gap-1 mt-1">
            {LEVELS.map(lvl => (
              <button
                key={lvl}
                onClick={() => update({ level: lvl, fontSize: LEVEL_SIZES[lvl] })}
                className={`flex-1 h-7 rounded text-xs font-bold transition-colors border ${
                  el.level === lvl
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-accent'
                }`}
              >
                H{lvl}
              </button>
            ))}
          </div>
        </div>

        <NumberInput label="Font Size" value={el.fontSize} min={6} max={144} onChange={v => update({ fontSize: v })} />

        <div>
          <Label>Font Family</Label>
          <Select value={el.fontFamily} onValueChange={v => update({ fontFamily: v as HeadingElement['fontFamily'] })}>
            <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Align</Label>
            <Select value={el.textAlign} onValueChange={v => update({ textAlign: v as HeadingElement['textAlign'] })}>
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
            <Select value={el.verticalAlign} onValueChange={v => update({ verticalAlign: v as HeadingElement['verticalAlign'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="middle">Middle</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ColorPicker label="Font Color" value={el.fontColor} onChange={v => update({ fontColor: v })} />
        <ColorPicker
          label="Background"
          value={el.backgroundColor === 'transparent' ? '#ffffff' : el.backgroundColor}
          onChange={v => update({ backgroundColor: v })}
        />

        <div className="flex items-center justify-between">
          <Label>Underline</Label>
          <Switch checked={el.underline} onCheckedChange={v => update({ underline: v })} />
        </div>

        <NumberInput label="Padding" value={el.padding} min={0} max={40} onChange={v => update({ padding: v })} />

      </AccordionContent>
    </AccordionItem>
  );
});
HeadingProperties.displayName = 'HeadingProperties';
