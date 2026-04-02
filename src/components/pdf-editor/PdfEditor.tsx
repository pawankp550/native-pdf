import React, { useState } from 'react';
import { Toolbar } from './Toolbar';
import { LeftPanel } from './LeftPanel';
import { Canvas } from './Canvas';
import { RightPanel } from './RightPanel';
import { PageStrip } from './PageStrip';
import { Toaster } from 'sonner';
import type { EditorAction } from '@/App';

interface Props {
  initialAction?: EditorAction;
}

export const PdfEditor = ({ initialAction }: Props) => {
  const [darkMode, setDarkMode] = useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      <Toolbar
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        initialAction={initialAction}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <Canvas />
        <RightPanel />
      </div>
      <PageStrip />
      <Toaster position="bottom-right" />
    </div>
  );
};
