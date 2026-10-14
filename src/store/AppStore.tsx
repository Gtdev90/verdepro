'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AppData,
  Client,
  Expense,
  Intervention,
  PaymentMethod,
  Settings,
  SporadicJob,
  TabId,
  ClientFilter,
  CassaSection,
} from '@/types';
import { createSeedData, DATA_VERSION } from '@/data/seed';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { addDays, estimatedVisitHours, todayISO, uid } from '@/lib/utils';

export type { ClientFilter, CassaSection };

const STORAGE_KEY = 'verdepro:data:v1';

function isAppData(v: unknown): v is AppData {
  if (!v || typeof v !== 'object') return false;
  const d = v as Partial<AppData>;
  return (
    d.version === DATA_VERSION &&
    Array.isArray(d.clients) &&
    Array.isArray(d.interventions) &&
    Array.isArray(d.sporadicJobs) &&
    Array.isArray(d.expenses) &&
    !!d.settings
  );
}

// ─────────────────────────────────────────────────────────────
// Tipi UI
// ─────────────────────────────────────────────────────────────

export type ToastKind = 'success' | 'info' | 'warning' | 'error';
export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

export interface CalcPrefill {
  clientId?: string;
  newClientName?: string;
  newClientPhone?: string;
  hours?: number;
  jobId?: string;
  notes?: string;
}

export interface NewInterventionInput extends Omit<Intervention, 'id' | 'clientName' | 'totalAmount' | 'clientId'> {
  clientId?: string;
  newClient?: { name: string; phone: string };
  totalAmount: number;
  jobId?: string;
}

interface StoreValue {

  hydrated: boolean;
  data: AppData;
  today: string;

  // Navigazione
  tab: TabId;
  setTab: (t: TabId) => void;
  calcPrefill: CalcPrefill | null;
  openCalculator: (p: CalcPrefill) => void;
  clearCalcPrefill: () => void;
  clientFilter: ClientFilter;
  setClientFilter: (f: ClientFilter) => void;
  cassaSection: CassaSection;
  setCassaSection: (s: CassaSection) => void;
  immersive: boolean;
  setImmersive: (v: boolean) => void;

  // Google Calendar (simulato)
  syncing: boolean;
  lastSyncAt: number;

  // Toast
  toasts: Toast[];
  notify: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;

  // Azioni clienti
  addClient: (c: Omit<Client, 'id'>) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  markFertilized: (clientId: string, date?: string) => void;
  postponeVisit: (clientId: string) => { freedDate: string; freedHours: number; newDate: string; newRecurrence: number } | null;

  // Interventi
  saveIntervention: (input: NewInterventionInput) => Intervention;
  markPaid: (id: string, method?: PaymentMethod) => void;
  markUnpaid: (id: string) => void;
  deleteIntervention: (id: string) => void;

  // Lavori sporadici
  addJob: (j: Omit<SporadicJob, 'id' | 'status'>) => SporadicJob;
  scheduleJob: (id: string, date: string) => void;
  unscheduleJob: (id: string) => void;
  deleteJob: (id: string) => void;

  // Spese
  addExpenses: (list: Omit<Expense, 'id'>[]) => void;
  deleteExpense: (id: string) => void;

  // Impostazioni
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve essere usato dentro <AppStoreProvider>');
  return ctx;
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [stored, setData, hydrated] = useLocalStorage<AppData>(STORAGE_KEY, () => createSeedData(), isAppData);

  const [tab, setTabState] = useState<TabId>('agenda');
  const [calcPrefill, setCalcPrefill] = useState<CalcPrefill | null>(null);
  const [clientFilter, setClientFilter] = useState<ClientFilter>('ALL');
  const [cassaSection, setCassaSection] = useState<CassaSection>('incassi');
  const [immersive, setImmersive] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(() => (typeof window !== 'undefined' ? Date.now() : 0));

  const [today, setToday] = useState(() => (typeof window !== 'undefined' ? todayISO() : ''));
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Aggiornato ogni minuto o al ritorno in app
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    const iv = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);


  const data = stored as AppData; // usato solo quando hydrated === true

  const notify = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = uid('t');
    setToasts((t) => [...t.slice(-2), { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  /** Simula il push verso Google Calendar dopo ogni modifica all'agenda */
  const triggerSync = useCallback(() => {
    setSyncing(true);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      setSyncing(false);
      setLastSyncAt(Date.now());
    }, 1100);
  }, []);

  const setTab = useCallback((t: TabId) => {
    setTabState(t);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openCalculator = useCallback(
    (p: CalcPrefill) => {
      setCalcPrefill(p);
      setTab('calcola');
    },
    [setTab],
  );

  const clearCalcPrefill = useCallback(() => setCalcPrefill(null), []);

  // ── Clienti ────────────────────────────────────────────────
  const addClient = useCallback(
    (c: Omit<Client, 'id'>) => {
      const client: Client = { ...c, id: uid('cli') };
      setData((d) => ({ ...d, clients: [...d.clients, client] }));
      triggerSync();
      return client;
    },
    [setData, triggerSync],
  );

  const updateClient = useCallback(
    (id: string, patch: Partial<Client>) => {
      setData((d) => ({
        ...d,
        clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        interventions: patch.name
          ? d.interventions.map((i) => (i.clientId === id ? { ...i, clientName: patch.name! } : i))
          : d.interventions,
      }));
      if (patch.nextVisitDate || patch.recurrenceWeeks !== undefined) triggerSync();
    },
    [setData, triggerSync],
  );

  const deleteClient = useCallback(
    (id: string) => {
      setData((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== id) }));
      triggerSync();
    },
    [setData, triggerSync],
  );

  const markFertilized = useCallback(
    (clientId: string, date?: string) => {
      setData((d) => ({
        ...d,
        clients: d.clients.map((c) => (c.id === clientId ? { ...c, lastFertilizationDate: date ?? todayISO() } : c)),
      }));
    },
    [setData],
  );

  const postponeVisit = useCallback(
    (clientId: string) => {
      const client = data?.clients.find((c) => c.id === clientId);
      if (!client) return null;
      const freedDate = client.nextVisitDate;
      const newDate = addDays(freedDate, 7);
      const newRecurrence = Math.max(1, client.recurrenceWeeks) + 1;
      const freedHours = estimatedVisitHours(client, data.interventions);
      setData((d) => ({
        ...d,
        clients: d.clients.map((c) =>
          c.id === clientId ? { ...c, nextVisitDate: newDate, recurrenceWeeks: newRecurrence } : c,
        ),
      }));
      triggerSync();
      return { freedDate, freedHours, newDate, newRecurrence };
    },
    [data, setData, triggerSync],
  );

  // ── Interventi ─────────────────────────────────────────────
  const saveIntervention = useCallback(
    (input: NewInterventionInput) => {
      const { newClient, jobId, clientId: inputClientId, ...rest } = input;
      let clientId = inputClientId ?? '';
      let clientName = '';
      let createdClient: Client | null = null;

      if (newClient) {
        createdClient = {
          id: uid('cli'),
          name: newClient.name.trim() || 'Cliente occasionale',
          phone: newClient.phone.trim(),
          address: '',
          recurrenceWeeks: 0,
          nextVisitDate: '',
          lastFertilizationDate: null,
          fertilizationIntervalDays: 150,
          technicalNotes: {},
          fixedMonthlyRate: null,
        };
        clientId = createdClient.id;
        clientName = createdClient.name;
      } else {
        clientName = data.clients.find((c) => c.id === clientId)?.name ?? 'Cliente';
      }

      const intervention: Intervention = {
        ...rest,
        id: uid('int'),
        clientId,
        clientName,
        paymentMethod: rest.paymentStatus === 'PAID' ? rest.paymentMethod ?? 'CASH' : undefined,
      };

      setData((d) => {
        let clients = createdClient ? [...d.clients, createdClient] : d.clients;
        clients = clients.map((c) => {
          if (c.id !== clientId) return c;
          let next = c;
          // Concimazione oggi → aggiorna lo scadenziario agronomico
          if (intervention.fertilizationApplied) next = { ...next, lastFertilizationDate: intervention.date };
          // Visita ricorrente chiusa → programma la successiva
          if (next.recurrenceWeeks > 0 && next.nextVisitDate && next.nextVisitDate <= intervention.date) {
            next = { ...next, nextVisitDate: addDays(intervention.date, next.recurrenceWeeks * 7) };
          }
          return next;
        });
        return {
          ...d,
          clients,
          interventions: [...d.interventions, intervention],
          sporadicJobs: jobId ? d.sporadicJobs.filter((j) => j.id !== jobId) : d.sporadicJobs,
        };
      });
      triggerSync();
      return intervention;
    },
    [data, setData, triggerSync],
  );

  const markPaid = useCallback(
    (id: string, method: PaymentMethod = 'CASH') => {
      setData((d) => ({
        ...d,
        interventions: d.interventions.map((i) =>
          i.id === id ? { ...i, paymentStatus: 'PAID', paymentMethod: method } : i,
        ),
      }));
    },
    [setData],
  );

  const markUnpaid = useCallback(
    (id: string) => {
      setData((d) => ({
        ...d,
        interventions: d.interventions.map((i) =>
          i.id === id ? { ...i, paymentStatus: 'UNPAID', paymentMethod: undefined } : i,
        ),
      }));
    },
    [setData],
  );

  const deleteIntervention = useCallback(
    (id: string) => setData((d) => ({ ...d, interventions: d.interventions.filter((i) => i.id !== id) })),
    [setData],
  );

  // ── Lavori sporadici ───────────────────────────────────────
  const addJob = useCallback(
    (j: Omit<SporadicJob, 'id' | 'status'>) => {
      const job: SporadicJob = { ...j, id: uid('job'), status: 'PENDING' };
      setData((d) => ({ ...d, sporadicJobs: [...d.sporadicJobs, job] }));
      return job;
    },
    [setData],
  );

  const scheduleJob = useCallback(
    (id: string, date: string) => {
      setData((d) => ({
        ...d,
        sporadicJobs: d.sporadicJobs.map((j) => (j.id === id ? { ...j, status: 'SCHEDULED', scheduledDate: date } : j)),
      }));
      triggerSync();
    },
    [setData, triggerSync],
  );

  const unscheduleJob = useCallback(
    (id: string) => {
      setData((d) => ({
        ...d,
        sporadicJobs: d.sporadicJobs.map((j) =>
          j.id === id ? { ...j, status: 'PENDING', scheduledDate: undefined } : j,
        ),
      }));
      triggerSync();
    },
    [setData, triggerSync],
  );

  const deleteJob = useCallback(
    (id: string) => {
      setData((d) => ({ ...d, sporadicJobs: d.sporadicJobs.filter((j) => j.id !== id) }));
      triggerSync();
    },
    [setData, triggerSync],
  );

  // ── Spese ──────────────────────────────────────────────────
  const addExpenses = useCallback(
    (list: Omit<Expense, 'id'>[]) => {
      const items = list.map((e) => ({ ...e, id: uid('exp') }));
      setData((d) => ({ ...d, expenses: [...items, ...d.expenses] }));
    },
    [setData],
  );

  const deleteExpense = useCallback(
    (id: string) => setData((d) => ({ ...d, expenses: d.expenses.filter((e) => e.id !== id) })),
    [setData],
  );

  // ── Impostazioni ───────────────────────────────────────────
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [setData],
  );

  const resetDemo = useCallback(() => {
    setData(createSeedData());
    setCalcPrefill(null);
    setClientFilter('ALL');
    setTabState('agenda');
    triggerSync();
  }, [setData, triggerSync]);

  const value = useMemo<StoreValue>(
    () => ({
      hydrated: hydrated && !!stored && !!today,
      data,
      today,
      tab,
      setTab,
      calcPrefill,
      openCalculator,
      clearCalcPrefill,
      clientFilter,
      setClientFilter,
      cassaSection,
      setCassaSection,
      immersive,
      setImmersive,
      syncing,
      lastSyncAt,
      toasts,
      notify,
      dismissToast,
      addClient,
      updateClient,
      deleteClient,
      markFertilized,
      postponeVisit,
      saveIntervention,
      markPaid,
      markUnpaid,
      deleteIntervention,
      addJob,
      scheduleJob,
      unscheduleJob,
      deleteJob,
      addExpenses,
      deleteExpense,
      updateSettings,
      resetDemo,
    }),
    [
      hydrated, stored, today, data, tab, setTab, calcPrefill, openCalculator, clearCalcPrefill, clientFilter,
      cassaSection, immersive, syncing, lastSyncAt, toasts, notify, dismissToast, addClient, updateClient,
      deleteClient, markFertilized, postponeVisit, saveIntervention, markPaid, markUnpaid, deleteIntervention,
      addJob, scheduleJob, unscheduleJob, deleteJob, addExpenses, deleteExpense, updateSettings, resetDemo,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
