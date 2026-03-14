import React from 'react';

interface HandleProps {
  onMouseDown: (e: React.MouseEvent, direction: string) => void;
  onRotateMouseDown: (e: React.MouseEvent) => void;
}

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

const handlePositions: Record<string, { top?: string; bottom?: string; left?: string; right?: string; transform?: string }> = {
  nw: { top: '-4px', left: '-4px' },
  n: { top: '-4px', left: '50%', transform: 'translateX(-50%)' },
  ne: { top: '-4px', right: '-4px' },
  e: { top: '50%', right: '-4px', transform: 'translateY(-50%)' },
  se: { bottom: '-4px', right: '-4px' },
  s: { bottom: '-4px', left: '50%', transform: 'translateX(-50%)' },
  sw: { bottom: '-4px', left: '-4px' },
  w: { top: '50%', left: '-4px', transform: 'translateY(-50%)' },
};

const cursors: Record<string, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
};

export const ElementHandles = React.memo(({ onMouseDown, onRotateMouseDown }: HandleProps) => (
  <>
    {/* Rotate handle */}
    <div
      style={{
        position: 'absolute',
        top: '-24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: '#3b82f6',
        border: '2px solid white',
        cursor: 'grab',
        zIndex: 1000,
      }}
      onMouseDown={onRotateMouseDown}
    />
    {/* Line from element to rotate handle */}
    <div
      style={{
        position: 'absolute',
        top: '-20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1px',
        height: '20px',
        background: '#3b82f6',
        pointerEvents: 'none',
      }}
    />
    {HANDLES.map(dir => (
      <div
        key={dir}
        style={{
          position: 'absolute',
          width: '8px',
          height: '8px',
          background: 'white',
          border: '2px solid #3b82f6',
          borderRadius: '1px',
          cursor: cursors[dir],
          zIndex: 1000,
          ...handlePositions[dir],
        }}
        onMouseDown={e => onMouseDown(e, dir)}
      />
    ))}
  </>
));
ElementHandles.displayName = 'ElementHandles';
