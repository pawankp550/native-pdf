import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { RadioElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { NumberInput } from './NumberInput';
import { ColorPicker } from './ColorPicker';

interface Props { element: RadioElement }

export const RadioProperties = React.memo(({ element: el }: Props) => {
  const dispatch = useAppDispatch();
  const update = (changes: Partial<RadioElement>) =>
    dispatch(updateElement({ id: el.id, changes: changes as Partial<typeof el> }));

  return (
    <AccordionItem value="style">
      <AccordionTrigger>Radio Button</AccordionTrigger>
      <AccordionContent className='overflow-auto'>
        <div className="space-y-2.5">

          {/* Checked preview */}
          <div
            className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-accent"
            onClick={() => update({ checked: !el.checked })}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box',
              border: `${el.strokeWidth}px solid ${el.strokeColor}`,
              backgroundColor: el.fillColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {el.checked && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: el.checkColor }} />
              )}
            </div>
            <span className="text-sm">{el.checked ? 'Selected' : 'Unselected'}</span>
            <Switch checked={el.checked} onCheckedChange={v => update({ checked: v })} className="ml-auto" />
          </div>

          <div>
            <Label>Label</Label>
            <Input
              className="mt-0.5 h-7 text-xs"
              value={el.label}
              onChange={e => update({ label: e.target.value })}
            />
          </div>

          <div>
            <Label>Label Position</Label>
            <Select value={el.labelPosition} onValueChange={v => update({ labelPosition: v as RadioElement['labelPosition'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="left">Left</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <NumberInput label="Label Font Size" value={el.labelFontSize} min={6} max={48} onChange={v => update({ labelFontSize: v })} />
          <ColorPicker label="Label Color"      value={el.labelColor}  onChange={v => update({ labelColor: v })} />
          <ColorPicker label="Circle Fill"      value={el.fillColor}   onChange={v => update({ fillColor: v })} />
          <ColorPicker label="Circle Border"    value={el.strokeColor} onChange={v => update({ strokeColor: v })} />
          <NumberInput label="Border Width"     value={el.strokeWidth} min={1} max={6} step={0.5} onChange={v => update({ strokeWidth: v })} />
          <ColorPicker label="Dot Color"        value={el.checkColor}  onChange={v => update({ checkColor: v })} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
});
RadioProperties.displayName = 'RadioProperties';
