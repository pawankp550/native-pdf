import React from 'react';
import { useAppDispatch } from '@/store/hooks';
import { updateElement } from '@/store/pdf-editor/slice';
import type { BulletListElement } from '@/store/pdf-editor/types/elements';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ColorPicker } from './ColorPicker';
import { NumberInput } from './NumberInput';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Props { element: BulletListElement }

const BULLET_STYLES = [
  { value: 'disc',    label: '• Disc' },
  { value: 'circle',  label: '◦ Circle' },
  { value: 'square',  label: '▪ Square' },
  { value: 'decimal', label: '1. Decimal' },
  { value: 'none',    label: 'None' },
];

const FONT_FAMILIES = ['Helvetica', 'Times New Roman', 'Courier', 'Georgia', 'Verdana', 'Arial'];

export const BulletListProperties = React.memo(({ element: el }: Props) => {
  const dispatch = useAppDispatch();
  const upd = (changes: Partial<BulletListElement>) =>
    dispatch(updateElement({ id: el.id, changes: changes as never }));

  const updateItem = (index: number, value: string) => {
    const items = [...el.items];
    items[index] = value;
    upd({ items });
  };

  const addItem = () => upd({ items: [...el.items, ''] });

  const removeItem = (index: number) => {
    if (el.items.length <= 1) return;
    upd({ items: el.items.filter((_, i) => i !== index) });
  };

  const moveItem = (from: number, to: number) => {
    const items = [...el.items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    upd({ items });
  };

  return (
    <>
      {/* Items */}
      <AccordionItem value="items">
        <AccordionTrigger className="text-xs font-semibold py-2">Items</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-1.5 pb-3 overflow-auto">
          {el.items.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  disabled={i === 0}
                  onClick={() => moveItem(i, i - 1)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                >
                  <GripVertical size={12} />
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">{i + 1}.</span>
              <Input
                value={item}
                onChange={e => updateItem(i, e.target.value)}
                className="h-6 text-xs flex-1"
                placeholder={`Item ${i + 1}`}
              />
              <button
                onClick={() => removeItem(i)}
                disabled={el.items.length <= 1}
                className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-20"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs mt-1">
            <Plus size={12} className="mr-1" /> Add Item
          </Button>
        </AccordionContent>
      </AccordionItem>

      {/* Style */}
      <AccordionItem value="style">
        <AccordionTrigger className="text-xs font-semibold py-2">Style</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2.5 pb-3 overflow-auto">
          <div>
            <Label className="text-xs">Bullet Style</Label>
            <Select value={el.bulletStyle} onValueChange={v => upd({ bulletStyle: v as BulletListElement['bulletStyle'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BULLET_STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Font Family</Label>
            <Select value={el.fontFamily} onValueChange={v => upd({ fontFamily: v as BulletListElement['fontFamily'] })}>
              <SelectTrigger className="mt-0.5 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <NumberInput label="Font Size" value={el.fontSize} min={6} max={72} onChange={v => upd({ fontSize: v })} />
            <div className="flex items-center gap-2 mt-4">
              <Switch
                checked={el.fontWeight === 'bold'}
                onCheckedChange={v => upd({ fontWeight: v ? 'bold' : 'normal' })}
              />
              <Label className="text-xs">Bold</Label>
            </div>
          </div>

          <NumberInput label="Line Height" value={el.lineHeight} min={1} max={3} step={0.1} onChange={v => upd({ lineHeight: v })} />
          <NumberInput label="Gap Between Items (px)" value={el.gap} min={0} max={40} onChange={v => upd({ gap: v })} />
          <NumberInput label="Indent Size (px)" value={el.indentSize} min={10} max={60} onChange={v => upd({ indentSize: v })} />

          <ColorPicker label="Text Color" value={el.fontColor} onChange={v => upd({ fontColor: v })} />
          <ColorPicker label="Bullet Color" value={el.bulletColor} onChange={v => upd({ bulletColor: v })} />
          <ColorPicker label="Background" value={el.backgroundColor} onChange={v => upd({ backgroundColor: v })} />
          <NumberInput label="Padding (px)" value={el.padding} min={0} max={32} onChange={v => upd({ padding: v })} />
        </AccordionContent>
      </AccordionItem>
    </>
  );
});
BulletListProperties.displayName = 'BulletListProperties';
