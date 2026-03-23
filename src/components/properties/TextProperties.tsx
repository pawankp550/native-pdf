import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { TextElement } from '@/store/pdf-editor/types/elements';
import { FONT_FAMILIES } from '@/constants/fonts';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';
import { Input } from '@/components/ui/input';

interface Props { element: TextElement }

export const TextProperties = React.memo(({ element: el }: Props) => {
  const dispatch = useAppDispatch();
  const update = (changes: Partial<TextElement>) => dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

  return (
    <AccordionItem value="style">
      <AccordionTrigger>Text Style</AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2.5">
          <div>
            <Label>Font Family</Label>
            <Select value={el.fontFamily} onValueChange={v => update({ fontFamily: v as TextElement['fontFamily'] })}>
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
              <Label>Weight</Label>
              <Select value={el.fontWeight} onValueChange={v => update({ fontWeight: v as TextElement['fontWeight'] })}>
                <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="400">Regular</SelectItem>
                  <SelectItem value="600">Semi Bold</SelectItem>
                  <SelectItem value="700">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Style</Label>
              <Select value={el.fontStyle} onValueChange={v => update({ fontStyle: v as TextElement['fontStyle'] })}>
                <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="italic">Italic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <NumberInput label="Font Size" value={el.fontSize} min={6} max={144} onChange={v => update({ fontSize: v })} />
          <div>
            <Label>Text Align</Label>
            <Select value={el.textAlign} onValueChange={v => update({ textAlign: v as TextElement['textAlign'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Line Height</Label>
            <div className="flex items-center gap-2 mt-1">
              <Slider min={1} max={3} step={0.1} value={[el.lineHeight]} onValueChange={([v]) => update({ lineHeight: v })} className="flex-1" />
              <span className="text-xs w-8 text-right">{el.lineHeight.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <Label>Letter Spacing</Label>
            <div className="flex items-center gap-2 mt-1">
              <Slider min={-2} max={20} step={0.5} value={[el.letterSpacing ?? 0]} onValueChange={([v]) => update({ letterSpacing: v })} className="flex-1" />
              <span className="text-xs w-8 text-right">{(el.letterSpacing ?? 0).toFixed(1)}</span>
            </div>
          </div>
          <div>
            <Label>Text Transform</Label>
            <Select value={el.textTransform ?? 'none'} onValueChange={v => update({ textTransform: v as TextElement['textTransform'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="uppercase">UPPERCASE</SelectItem>
                <SelectItem value="lowercase">lowercase</SelectItem>
                <SelectItem value="capitalize">Capitalize</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ColorPicker label="Font Color" value={el.fontColor} onChange={v => update({ fontColor: v })} />
          <ColorPicker label="Background" value={el.backgroundColor === 'transparent' ? '#ffffff' : el.backgroundColor} onChange={v => update({ backgroundColor: v })} />
          <div className="flex items-center justify-between">
            <Label>Underline</Label>
            <Switch checked={el.underline} onCheckedChange={v => update({ underline: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Strikethrough</Label>
            <Switch checked={el.strikethrough} onCheckedChange={v => update({ strikethrough: v })} />
          </div>
          <NumberInput label="Padding" value={el.padding} min={0} max={40} onChange={v => update({ padding: v })} />
          <div>
            <Label>Link URL</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="https://example.com"
              value={el.url ?? ''}
              onChange={e => update({ url: e.target.value })}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});
TextProperties.displayName = 'TextProperties';
