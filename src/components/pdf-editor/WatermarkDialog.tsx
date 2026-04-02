import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setWatermark } from '@/store/pdf-editor/slice';
import { selectWatermark } from '@/store/pdf-editor/selectors';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WatermarkSettings } from '@/store/pdf-editor/types/state';

interface Props {
  open: boolean;
  onClose: () => void;
}

const DEFAULTS: WatermarkSettings = {
  enabled: true,
  text: 'CONFIDENTIAL',
  fontSize: 72,
  color: '#d1d5db',
  opacity: 0.35,
  rotation: 45,
};

export const WatermarkDialog = ({ open, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectWatermark);
  const [settings, setSettings] = useState<WatermarkSettings>(current ?? DEFAULTS);

  const update = (changes: Partial<WatermarkSettings>) =>
    setSettings(prev => ({ ...prev, ...changes }));

  const handleApply = () => {
    dispatch(setWatermark(settings.text.trim() ? settings : null));
    onClose();
  };

  const handleRemove = () => {
    dispatch(setWatermark(null));
    setSettings(DEFAULTS);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Watermark</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Text */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Text</label>
            <Input
              value={settings.text}
              onChange={e => update({ text: e.target.value })}
              placeholder="e.g. CONFIDENTIAL"
              className="text-sm"
            />
          </div>

          {/* Font size */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-muted-foreground">Font size</label>
              <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
            </div>
            <input
              type="range" min={20} max={200} step={2}
              value={settings.fontSize}
              onChange={e => update({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* Color + opacity */}
          <div className="flex gap-4">
            <div className="space-y-1 flex-1">
              <label className="text-xs font-medium text-muted-foreground">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.color}
                  onChange={e => update({ color: e.target.value })}
                  className="h-7 w-10 rounded border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">{settings.color}</span>
              </div>
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex justify-between">
                <label className="text-xs font-medium text-muted-foreground">Opacity</label>
                <span className="text-xs text-muted-foreground">{Math.round(settings.opacity * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={settings.opacity}
                onChange={e => update({ opacity: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs font-medium text-muted-foreground">Rotation</label>
              <span className="text-xs text-muted-foreground">{settings.rotation}°</span>
            </div>
            <input
              type="range" min={0} max={360} step={5}
              value={settings.rotation}
              onChange={e => update({ rotation: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* Preview */}
          <div className="relative h-24 rounded border bg-muted/30 overflow-hidden flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground absolute top-1 left-2">Preview</span>
            {settings.text && (
              <span
                style={{
                  fontSize: Math.max(10, settings.fontSize * 0.18),
                  color: settings.color,
                  opacity: settings.opacity,
                  transform: `rotate(${settings.rotation}deg)`,
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  userSelect: 'none',
                }}
              >
                {settings.text}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={handleRemove} disabled={!current}>
              Remove
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleApply} disabled={!settings.text.trim()}>Apply</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
