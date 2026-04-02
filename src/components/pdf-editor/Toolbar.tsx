import React from 'react';
import { ToolbarLeft } from './toolbar/ToolbarLeft';
import { ToolbarCenter } from './toolbar/ToolbarCenter';
import { ToolbarRight } from './toolbar/ToolbarRight';
import type { EditorAction } from '@/App';

interface ToolbarProps {
  darkMode: boolean;
  onToggleDark: () => void;
  initialAction?: EditorAction;
}

export const Toolbar = React.memo(({ darkMode, onToggleDark, initialAction }: ToolbarProps) => (
  <header className="h-12 border-b bg-background shrink-0 z-10 overflow-x-auto">
    <div className="flex items-center h-full px-3 gap-2 min-w-max">
      <ToolbarLeft />
      <div className="w-4" />
      <ToolbarCenter />
      <div className="w-4" />
      <ToolbarRight darkMode={darkMode} onToggleDark={onToggleDark} initialAction={initialAction} />
    </div>
  </header>
));
Toolbar.displayName = 'Toolbar';
