import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setHeader, setFooter } from '@/store/pdf-editor/slice';
import { selectHeader, selectFooter } from '@/store/pdf-editor/selectors';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HeaderFooterSettings } from '@/store/pdf-editor/types/state';

interface Props {
  open: boolean;
  onClose: () => void;
}

const HEADER_DEFAULTS: HeaderFooterSettings = {
  enabled: true,
  height: 36,
  fontSize: 9,
  color: '#374151',
  backgroundColor: 'transparent',
  showBorder: true,
  borderColor: '#d1d5db',
  zones: { left: '', center: '', right: '' },
};

const FOOTER_DEFAULTS: HeaderFooterSettings = {
  ...HEADER_DEFAULTS,
  zones: { left: '{date}', center: '', right: 'Page {page} of {total}' },
};

const VARIABLES = ['{page}', '{total}', '{date}'] as const;

function resolvePreview(text: string): string {
  return text
    .replace(/\{page\}/g, '1')
    .replace(/\{total\}/g, '3')
    .replace(/\{date\}/g, new Date().toLocaleDateString());
}

export const HeaderFooterDialog = ({ open, onClose }: Props) => {
  const dispatch = useAppDispatch();
  const currentHeader = useAppSelector(selectHeader);
  const currentFooter = useAppSelector(selectFooter);

  const [tab, setTab] = useState<'header' | 'footer'>('header');
  const [headerSettings, setHeaderSettings] = useState<HeaderFooterSettings>(currentHeader ?? HEADER_DEFAULTS);
  const [footerSettings, setFooterSettings] = useState<HeaderFooterSettings>(currentFooter ?? FOOTER_DEFAULTS);

  useEffect(() => {
    if (open) {
      setHeaderSettings(currentHeader ?? HEADER_DEFAULTS);
      setFooterSettings(currentFooter ?? FOOTER_DEFAULTS);
      setTab('header');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const leftRef = useRef<HTMLInputElement>(null);
  const centerRef = useRef<HTMLInputElement>(null);
  const rightRef = useRef<HTMLInputElement>(null);

  const isHeader = tab === 'header';
  const settings = isHeader ? headerSettings : footerSettings;
  const setSettings = isHeader ? setHeaderSettings : setFooterSettings;

  const update = (changes: Partial<HeaderFooterSettings>) =>
    setSettings(prev => ({ ...prev, ...changes }));

  const updateZone = (zone: 'left' | 'center' | 'right', value: string) =>
    update({ zones: { ...settings.zones, [zone]: value } });

  const insertVariable = (zone: 'left' | 'center' | 'right', variable: string) => {
    const ref = zone === 'left' ? leftRef : zone === 'center' ? centerRef : rightRef;
    const input = ref.current;
    const current = settings.zones[zone];
    if (!input) { updateZone(zone, current + variable); return; }
    const start = input.selectionStart ?? current.length;
    const end = input.selectionEnd ?? start;
    updateZone(zone, current.slice(0, start) + variable + current.slice(end));
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  const handleApply = () => {
    dispatch(setHeader(headerSettings.enabled ? headerSettings : null));
    dispatch(setFooter(footerSettings.enabled ? footerSettings : null));
    onClose();
  };

  const handleClear = () => {
    if (isHeader) {
      setHeaderSettings(HEADER_DEFAULTS);
      dispatch(setHeader(null));
    } else {
      setFooterSettings(FOOTER_DEFAULTS);
      dispatch(setFooter(null));
    }
  };

  const renderZoneInput = (zone: 'left' | 'center' | 'right', label: string) => {
    const ref = zone === 'left' ? leftRef : zone === 'center' ? centerRef : rightRef;
    return (
      <div className="space-y-1" key={zone}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">{label}</label>
          <div className="flex gap-1">
            {VARIABLES.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => insertVariable(zone, v)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent text-muted-foreground font-mono leading-none cursor-pointer"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <Input
          ref={ref}
          value={settings.zones[zone]}
          onChange={e => updateZone(zone, e.target.value)}
          placeholder={`${label} zone…`}
          className="text-xs h-7"
        />
      </div>
    );
  };

  const previewBorderStyle = isHeader
    ? { borderBottom: settings.showBorder ? `1px solid ${settings.borderColor}` : 'none' }
    : { borderTop: settings.showBorder ? `1px solid ${settings.borderColor}` : 'none' };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Header &amp; Footer</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b -mt-1 mb-1">
          {(['header', 'footer'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm capitalize transition-colors relative ${tab === t ? 'border-b-2 border-primary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t === 'header' ? 'Header' : 'Footer'}
              {(t === 'header' ? currentHeader : currentFooter) && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle mb-0.5" />
              )}
            </button>
          ))}
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Enable {isHeader ? 'Header' : 'Footer'}</span>
            <button
              type="button"
              onClick={() => update({ enabled: !settings.enabled })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.enabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {settings.enabled && (
            <>
              {/* Height */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Height</label>
                  <span className="text-xs text-muted-foreground">{settings.height}px</span>
                </div>
                <input
                  type="range" min={24} max={80} step={2}
                  value={settings.height}
                  onChange={e => update({ height: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>

              {/* Zones */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Content Zones</p>
                {renderZoneInput('left', 'Left')}
                {renderZoneInput('center', 'Center')}
                {renderZoneInput('right', 'Right')}
              </div>

              {/* Font size + text color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Font size</label>
                    <span className="text-xs text-muted-foreground">{settings.fontSize}pt</span>
                  </div>
                  <input
                    type="range" min={7} max={16} step={1}
                    value={settings.fontSize}
                    onChange={e => update({ fontSize: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Text color</label>
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
              </div>

              {/* Background + Border */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.backgroundColor === 'transparent' ? '#ffffff' : settings.backgroundColor}
                      onChange={e => update({ backgroundColor: e.target.value })}
                      disabled={settings.backgroundColor === 'transparent'}
                      className="h-7 w-10 rounded border cursor-pointer disabled:opacity-40"
                    />
                    <button
                      type="button"
                      onClick={() => update({ backgroundColor: settings.backgroundColor === 'transparent' ? '#f9fafb' : 'transparent' })}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${settings.backgroundColor === 'transparent' ? 'bg-muted text-muted-foreground border-border' : 'bg-primary/10 border-primary/30 text-primary'}`}
                    >
                      {settings.backgroundColor === 'transparent' ? 'None' : 'Color'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      {isHeader ? 'Bottom' : 'Top'} border
                    </label>
                    <input
                      type="checkbox"
                      checked={settings.showBorder}
                      onChange={e => update({ showBorder: e.target.checked })}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                  </div>
                  {settings.showBorder && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={settings.borderColor}
                        onChange={e => update({ borderColor: e.target.value })}
                        className="h-7 w-10 rounded border cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground font-mono">{settings.borderColor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Preview</label>
                <div
                  className="rounded overflow-hidden border"
                  style={{
                    height: Math.max(28, Math.round(settings.height * 0.7)),
                    backgroundColor: settings.backgroundColor === 'transparent' ? 'transparent' : settings.backgroundColor,
                    ...previewBorderStyle,
                  }}
                >
                  <div className="h-full flex items-center">
                    {(['left', 'center', 'right'] as const).map(zone => (
                      <span
                        key={zone}
                        style={{
                          flex: 1,
                          textAlign: zone,
                          fontSize: Math.max(8, settings.fontSize * 0.85),
                          color: settings.zones[zone] ? settings.color : '#9ca3af',
                          padding: '0 6px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {settings.zones[zone] ? resolvePreview(settings.zones[zone]) : zone}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={!(isHeader ? currentHeader : currentFooter)}
          >
            Clear {isHeader ? 'Header' : 'Footer'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
