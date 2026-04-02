import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTemplateName } from '@/store/pdf-editor/slice';
import { selectTemplateName, selectIsDirty } from '@/store/pdf-editor/selectors';
import { Input } from '@/components/ui/input';
import { Circle } from 'lucide-react';

export const ToolbarLeft = React.memo(() => {
  const dispatch = useAppDispatch();
  const templateName = useAppSelector(selectTemplateName);
  const isDirty = useAppSelector(selectIsDirty);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(templateName);

  const commit = () => {
    dispatch(setTemplateName(value));
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-bold text-primary text-sm whitespace-nowrap hidden lg:inline">PDF Editor</span>
      <span className="text-muted-foreground hidden lg:inline">/</span>
      {editing ? (
        <Input
          value={value}
          autoFocus
          className="h-6 w-40 text-sm"
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setValue(templateName); setEditing(false); }
          }}
        />
      ) : (
        <button
          className="text-sm font-medium hover:text-primary truncate max-w-[160px]"
          onClick={() => { setValue(templateName); setEditing(true); }}
        >
          {templateName}
        </button>
      )}
      {isDirty && (
        <span title="Unsaved changes">
          <Circle size={6} className="fill-orange-400 text-orange-400" />
        </span>
      )}
    </div>
  );
});
ToolbarLeft.displayName = 'ToolbarLeft';
