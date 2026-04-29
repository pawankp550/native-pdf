import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { LinkElement } from '@/store/pdf-editor/types/elements';
import { FONT_FAMILIES } from '@/constants/fonts';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: LinkElement }

export const LinkProperties = React.memo(({ element: el }: Props) => {
  const dispatch = useAppDispatch();
  const update = (changes: Partial<LinkElement>) => dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

  return (
    <AccordionItem value="style">
      <AccordionTrigger>Link Style</AccordionTrigger>
      <AccordionContent className='overflow-auto'>
        <div className="space-y-2.5">
          <div>
            <Label>Label</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="Link text"
              value={el.label}
              onChange={e => update({ label: e.target.value })}
            />
          </div>
          <div>
            <Label>URL</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              placeholder="https://example.com"
              value={el.url}
              onChange={e => update({ url: e.target.value })}
            />
          </div>
          <div>
            <Label>Font Family</Label>
            <Select value={el.fontFamily} onValueChange={v => update({ fontFamily: v as LinkElement['fontFamily'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberInput label="Font Size" value={el.fontSize} min={6} max={144} onChange={v => update({ fontSize: v })} />
          <div>
            <Label>Text Align</Label>
            <Select value={el.textAlign} onValueChange={v => update({ textAlign: v as LinkElement['textAlign'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ColorPicker label="Link Color" value={el.fontColor} onChange={v => update({ fontColor: v })} />
          <NumberInput label="Padding" value={el.padding} min={0} max={40} onChange={v => update({ padding: v })} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});
LinkProperties.displayName = 'LinkProperties';
