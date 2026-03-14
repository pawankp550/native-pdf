import React, { useState } from 'react';
import { Type, Minus, Square, Circle, CheckSquare, PenLine, Table2, ImageIcon, Hash, QrCode, CalendarDays, Heading } from 'lucide-react';
import type { ElementType } from '@/store/pdf-editor/types/elements';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

interface PaletteItem {
    type: ElementType;
    label: string;
    Icon: React.FC<{ size?: number }>;
}

const SECTIONS: { title: string; items: PaletteItem[] }[] = [
    {
        title: 'Basic Shapes',
        items: [
            { type: 'heading', label: 'Heading', Icon: Heading },
            { type: 'text', label: 'Text', Icon: Type },
            { type: 'line', label: 'Line', Icon: Minus },
            { type: 'rectangle', label: 'Rectangle', Icon: Square },
            { type: 'circle', label: 'Circle', Icon: Circle },
        ],
    },
    {
        title: 'Form Elements',
        items: [
            { type: 'checkbox', label: 'Checkbox', Icon: CheckSquare },
            { type: 'signature', label: 'Signature', Icon: PenLine },
            { type: 'signature-pad', label: 'Sign Pad', Icon: PenLine },
            { type: 'date', label: 'Date', Icon: CalendarDays },
        ],
    },
    {
        title: 'Advanced',
        items: [
            { type: 'table', label: 'Table', Icon: Table2 },
            { type: 'image', label: 'Image', Icon: ImageIcon },
            { type: 'page-number', label: 'Page No.', Icon: Hash },
            { type: 'qr-code', label: 'QR Code', Icon: QrCode },
        ],
    },
];

export const LeftPanel = React.memo(() => {
    const [search, setSearch] = useState('');

    const filtered = SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item =>
            item.label.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(section => section.items.length > 0);

    return (
        <aside className="w-[220px] border-r bg-background flex flex-col shrink-0 overflow-y-auto">
            <div className="p-2 border-b">
                <Input
                    placeholder="Search elements…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-7 text-xs"
                />
            </div>
            <div className="p-2 flex flex-col gap-3">
                {filtered.map((section, si) => (
                    <div key={section.title}>
                        {si > 0 && <Separator className="mb-2" />}
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                            {section.title}
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                            {section.items.map(item => (
                                <DraggableTile key={item.type} item={item} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
});
LeftPanel.displayName = 'LeftPanel';

const DraggableTile = React.memo(({ item }: { item: PaletteItem }) => (
    <div
        draggable
        onDragStart={e => {
            e.dataTransfer.setData('text/plain', item.type);
            e.dataTransfer.effectAllowed = 'copy';
        }}
        className="flex flex-col items-center justify-center gap-1 p-2 rounded-md border border-border bg-card hover:bg-accent hover:border-primary cursor-grab active:cursor-grabbing transition-colors select-none"
        title={`Drag to add ${item.label}`}
    >
        <item.Icon size={18} />
        <span className="text-[10px] text-center leading-tight">{item.label}</span>
    </div>
));
DraggableTile.displayName = 'DraggableTile';
