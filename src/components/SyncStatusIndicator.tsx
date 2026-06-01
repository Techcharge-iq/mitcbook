import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, Check, Loader2, AlertCircle, Radio } from 'lucide-react';
import { syncBus } from '@/lib/cloudSync';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'saving' | 'saved' | 'error' | 'remote' | 'offline';

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<Status>(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle'
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const setWithTimeout = (s: Status, ms: number) => {
      setStatus(s);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setStatus((cur) => (cur === s ? 'idle' : cur)), ms);
    };

    const unsub = syncBus.subscribe((e) => {
      if (!navigator.onLine) { setStatus('offline'); return; }
      if (e === 'saving') setStatus('saving');
      else if (e === 'saved') setWithTimeout('saved', 1500);
      else if (e === 'error') setWithTimeout('error', 3000);
      else if (e === 'remote-update') setWithTimeout('remote', 2000);
    });

    const onOnline = () => setWithTimeout('saved', 1200);
    const onOffline = () => setStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const map: Record<Status, { icon: React.ReactNode; label: string; cls: string }> = {
    idle:    { icon: <Cloud className="h-3.5 w-3.5" />,       label: 'Synced',          cls: 'bg-muted text-muted-foreground' },
    saving:  { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: 'Saving…', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    saved:   { icon: <Check className="h-3.5 w-3.5" />,       label: 'Saved',           cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    error:   { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Sync error',      cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
    remote:  { icon: <Radio className="h-3.5 w-3.5" />,       label: 'Update received', cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
    offline: { icon: <CloudOff className="h-3.5 w-3.5" />,    label: 'Offline',         cls: 'bg-muted text-muted-foreground' },
  };
  const s = map[status];

  return (
    <span
      title={s.label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
        s.cls
      )}
    >
      {s.icon}
      <span className="hidden sm:inline">{s.label}</span>
    </span>
  );
}

export default SyncStatusIndicator;
