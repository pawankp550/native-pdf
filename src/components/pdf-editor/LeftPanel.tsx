import React, { useState, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Type, Minus, Square, Circle, CheckSquare, PenLine, Table2, ImageIcon, Hash, QrCode, CalendarDays, Heading, Link } from 'lucide-react';
import { Grid } from 'react-window';
import type { ElementType } from '@/store/pdf-editor/types/elements';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Element palette
// ---------------------------------------------------------------------------

interface PaletteItem {
  type: ElementType;
  label: string;
  Icon: React.FC<{ size?: number }>;
}

const SECTIONS: { title: string; items: PaletteItem[] }[] = [
  {
    title: 'Basic Shapes',
    items: [
      { type: 'heading',   label: 'Heading',   Icon: Heading },
      { type: 'text',      label: 'Text',       Icon: Type },
      { type: 'link',      label: 'Link',       Icon: Link },
      { type: 'line',      label: 'Line',       Icon: Minus },
      { type: 'rectangle', label: 'Rectangle',  Icon: Square },
      { type: 'circle',    label: 'Circle',     Icon: Circle },
    ],
  },
  {
    title: 'Form Elements',
    items: [
      { type: 'checkbox',      label: 'Checkbox',  Icon: CheckSquare },
      { type: 'signature',     label: 'Signature', Icon: PenLine },
      { type: 'signature-pad', label: 'Sign Pad',  Icon: PenLine },
      { type: 'date',          label: 'Date',      Icon: CalendarDays },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { type: 'table',       label: 'Table',    Icon: Table2 },
      { type: 'image',       label: 'Image',    Icon: ImageIcon },
      { type: 'page-number', label: 'Page No.', Icon: Hash },
      { type: 'qr-code',     label: 'QR Code',  Icon: QrCode },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lucide icon list (all primary icons, sorted)
// ---------------------------------------------------------------------------

interface IconEntry {
  name: string;
  label: string;
  Icon: LucideIcon;
}

function toLabel(name: string): string {
  return name
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

// Build once at module load — filter out alias exports (ending in "Icon")
const ALL_ICONS: IconEntry[] = (
  Object.entries(LucideIcons) as [string, unknown][]
)
  .filter(([name, val]) =>
    /^[A-Z]/.test(name) &&
    !name.endsWith('Icon') &&
    val !== null &&
    typeof val === 'object',
  )
  .map(([name, val]) => ({ name, label: toLabel(name), Icon: val as LucideIcon }))
  .sort((a, b) => a.name.localeCompare(b.name));

// ---------------------------------------------------------------------------
// Grid constants (panel fixed at 220px, p-2 = 8px each side → 204px inner)
// ---------------------------------------------------------------------------
const COLS      = 3;
const COL_W     = 68;   // 204 / 3
const ROW_H     = 44;   // icon (14) + label + padding
const GRID_W    = COLS * COL_W;  // 204
const GRID_H    = 280;  // visible rows ~5

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LeftPanel = React.memo(() => {
  const [search, setSearch] = useState('');
  const q = search.toLowerCase();

  const allItems = SECTIONS.flatMap(s => s.items);
  const filteredItems = allItems.filter(item => item.label.toLowerCase().includes(q));

  const filteredIcons = q
    ? ALL_ICONS.filter(ic => ic.label.toLowerCase().includes(q))
    : ALL_ICONS;

  return (
    <aside className="w-[220px] border-r bg-background flex flex-col shrink-0 overflow-y-auto">
      <div className="p-2 border-b sticky top-0 bg-background z-10">
        <Input
          placeholder="Search elements…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <div className="p-2 flex flex-col gap-3">
        {filteredItems.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-1.5 px-1 flex justify-center">
              Elements
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {filteredItems.map(item => (
                <DraggableTile key={item.type} item={item} />
              ))}
            </div>
          </div>
        )}

        {filteredIcons.length > 0 && (
          <div>
            {filteredItems.length > 0 && <Separator className="mb-2" />}
            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-1.5 px-1 flex justify-center">
              Icons
            </p>
            <IconGrid icons={filteredIcons} />
          </div>
        )}
      </div>
    </aside>
  );
});
LeftPanel.displayName = 'LeftPanel';

// ---------------------------------------------------------------------------
// Palette tile
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Virtualized icon grid
// ---------------------------------------------------------------------------

type IconCellProps = { icons: IconEntry[] };

type GridCellComponentProps = {
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
} & IconCellProps;

const GridCell = ({ columnIndex, rowIndex, style, icons }: GridCellComponentProps) => {
  const idx = rowIndex * COLS + columnIndex;
  if (idx >= icons.length) return <div style={style} />;
  const { label, Icon } = icons[idx];
  return (
    <div style={style} className="p-0.5">
      <IconTile label={label} Icon={Icon} />
    </div>
  );
};

const IconGrid = React.memo(({ icons }: { icons: IconEntry[] }) => {
  const rowCount = Math.ceil(icons.length / COLS);
  const height = Math.min(GRID_H, rowCount * ROW_H);

  return (
    <Grid<IconCellProps>
      cellComponent={GridCell}
      cellProps={{ icons }}
      columnCount={COLS}
      columnWidth={COL_W}
      rowCount={rowCount}
      rowHeight={ROW_H}
      defaultHeight={height}
      defaultWidth={GRID_W}
      style={{ height, width: GRID_W }}
    />
  );
});
IconGrid.displayName = 'IconGrid';

const IconTile = React.memo(({ label, Icon }: { label: string; Icon: LucideIcon }) => {
  const onDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const svg = e.currentTarget.querySelector('svg');
    if (svg) {
      const svgStr = new XMLSerializer().serializeToString(svg);
      const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'image', src }));
    }
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex flex-col items-center justify-center gap-0.5 p-1 rounded border border-border bg-card hover:bg-accent hover:border-primary cursor-grab active:cursor-grabbing transition-colors select-none h-full w-full"
      title={`Drag to add ${label}`}
    >
      <Icon size={12} strokeWidth={1.5} />
      <span className="text-[7px] text-center leading-tight line-clamp-2 w-full text-center px-0.5">
        {label}
      </span>
    </div>
  );
});
IconTile.displayName = 'IconTile';
