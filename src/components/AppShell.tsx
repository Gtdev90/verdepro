'use client';

import { useState } from 'react';
import {
  CalendarDays,
  Calculator,
  CheckCircle2,
  Info,
  Leaf,
  RefreshCw,
  RotateCcw,
  Settings as SettingsIcon,
  TriangleAlert,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/store/AppStore';
import type { TabId } from '@/types';
import { Button, Field, Sheet, cn, inputCls } from './ui';

const TABS: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'calcola', label: 'Calcola', icon: Calculator },
  { id: 'clienti', label: 'Clienti', icon: Users },
  { id: 'cassa', label: 'Cassa', icon: Wallet },
];

export function SyncBadge({ compact }: { compact?: boolean }) {
  const { syncing, lastSyncAt } = useStore();
  const time = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
  return (
    <a
      href="https://calendar.google.com/calendar/r"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-50 ring-1 ring-white/20 transition active:scale-95',
        syncing && 'text-amber-200',
      )}
      title="Apri Google Calendar"
    >
      {syncing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </span>
      )}
      {syncing ? 'Sincronizzazione…' : compact ? `Google Calendar · ${time}` : `Sincronizzato con Google Calendar · ${time}`}
    </a>
  );
}

function Header({ onSettings }: { onSettings: () => void }) {
  return (
    <header className="sticky top-0 z-30 bg-emerald-950 text-white pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-emerald-950 shadow-inner">
          <Leaf className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xl font-black leading-none tracking-tight">
            Verde<span className="text-emerald-400">Pro</span>
          </div>
          <div className="mt-1">
            <SyncBadge compact />
          </div>
        </div>
        <button
          onClick={onSettings}
          className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 transition active:scale-95"
          aria-label="Impostazioni"
        >
          <SettingsIcon className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const { tab, setTab, data } = useStore();
  const unpaid = data.interventions.filter((i) => i.paymentStatus === 'UNPAID').length;
  return (
    <nav className="sticky bottom-0 z-40 w-full border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold transition',
                active ? 'text-emerald-700' : 'text-slate-500',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'grid h-8 w-14 place-items-center rounded-full transition',
                  active ? 'bg-emerald-100' : 'bg-transparent',
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.6 : 2} />
              </span>
              {label}
              {id === 'cassa' && unpaid > 0 && (
                <span className="absolute right-[22%] top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-black text-white">
                  {unpaid}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] mx-auto flex w-full max-w-md flex-col items-center gap-2 px-4 pt-[env(safe-area-inset-top)]">
      {toasts.map((t) => {
        const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'warning' ? TriangleAlert : t.kind === 'error' ? XCircle : Info;
        const tone =
          t.kind === 'success'
            ? 'bg-emerald-600 text-white'
            : t.kind === 'warning'
              ? 'bg-amber-400 text-amber-950'
              : t.kind === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 text-white';
        return (
          <button
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={cn(
              'pointer-events-auto flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold shadow-xl animate-toast',
              tone,
            )}
          >
            <Icon className="h-6 w-6 shrink-0" />
            <span className="flex-1">{t.message}</span>
          </button>
        );
      })}
    </div>
  );
}

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, updateSettings, resetDemo, notify } = useStore();
  const s = data.settings;
  const [confirm, setConfirm] = useState(false);

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        setConfirm(false);
        onClose();
      }}
      title="Impostazioni"
      subtitle="Tariffe predefinite e dati demo"
      icon={<SettingsIcon className="h-7 w-7 text-emerald-600" />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tariffa oraria (€/h)">
            <input
              inputMode="decimal"
              className={inputCls}
              value={s.defaultHourlyRate}
              onChange={(e) => updateSettings({ defaultHourlyRate: num(e.target.value) })}
            />
          </Field>
          <Field label="Operai di default">
            <input
              inputMode="numeric"
              className={inputCls}
              value={s.defaultWorkers}
              onChange={(e) => updateSettings({ defaultWorkers: Math.max(1, Math.round(num(e.target.value))) })}
            />
          </Field>
          <Field label="Prezzo concimazione (€)">
            <input
              inputMode="decimal"
              className={inputCls}
              value={s.defaultFertilizationPrice}
              onChange={(e) => updateSettings({ defaultFertilizationPrice: num(e.target.value) })}
            />
          </Field>
          <Field label="Ore lavoro/giorno">
            <input
              inputMode="decimal"
              className={inputCls}
              value={s.workdayHours}
              onChange={(e) => updateSettings({ workdayHours: num(e.target.value) })}
            />
          </Field>
          <Field label="Soglia pedana concime (€/anno)">
            <input
              inputMode="decimal"
              className={inputCls}
              value={s.palletThresholdConcime}
              onChange={(e) => updateSettings({ palletThresholdConcime: num(e.target.value) })}
            />
          </Field>
          <Field label="Soglia pedana irrigaz. (€/anno)">
            <input
              inputMode="decimal"
              className={inputCls}
              value={s.palletThresholdIrrigazione}
              onChange={(e) => updateSettings({ palletThresholdIrrigazione: num(e.target.value) })}
            />
          </Field>
          <Field label="Sconto medio pedana (%)">
            <input
              inputMode="decimal"
              className={inputCls}
              value={Math.round(s.palletDiscount * 100)}
              onChange={(e) => updateSettings({ palletDiscount: Math.min(0.9, num(e.target.value) / 100) })}
            />
          </Field>
        </div>

        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
          <div className="font-extrabold text-slate-900">Google Calendar</div>
          <p className="mt-1 text-sm text-slate-500">
            Sincronizzazione simulata nella demo: ogni modifica in agenda viene &quot;spinta&quot; sul calendario. Da ogni
            appuntamento puoi aprire il link rapido per salvarlo davvero su Google Calendar.
          </p>
          <div className="mt-3 rounded-2xl bg-emerald-950 p-2">
            <SyncBadge />
          </div>
        </div>

        <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-200">
          <div className="font-extrabold text-red-900">Ripristina Dati Demo</div>
          <p className="mt-1 text-sm text-red-800/80">
            Cancella tutte le modifiche salvate su questo dispositivo e ricarica clienti, conti, lavori e spese di esempio.
          </p>
          {!confirm ? (
            <Button variant="outline" className="mt-3 w-full" onClick={() => setConfirm(true)}>
              <RotateCcw className="h-5 w-5" /> Ripristina Dati Demo
            </Button>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setConfirm(false)}>
                Annulla
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  resetDemo();
                  setConfirm(false);
                  onClose();
                  notify('Dati demo ripristinati');
                }}
              >
                Sì, ripristina
              </Button>
            </div>
          )}
        </div>
        <p className="pb-2 text-center text-xs text-slate-400">VerdePro MVP · dati salvati solo su questo dispositivo</p>
      </div>
    </Sheet>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { immersive } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-slate-300/60 md:py-6">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-slate-100 shadow-2xl md:min-h-[calc(100dvh-3rem)] md:overflow-clip md:rounded-[2.5rem] md:ring-8 md:ring-slate-900">
        {!immersive && <Header onSettings={() => setSettingsOpen(true)} />}
        <main className={cn('flex-1', !immersive && 'pb-8')}>{children}</main>
        {!immersive && <BottomNav />}
      </div>
      <Toaster />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
