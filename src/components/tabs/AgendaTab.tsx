'use client';

import { useMemo, useState } from 'react';
import {
  AlarmClock,
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Calculator,
  CheckCircle2,
  Clock,
  Hammer,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
  Undo2,
  Wrench,
  Zap,
} from 'lucide-react';
import { useStore } from '@/store/AppStore';
import type { Client, JobPriority, SporadicJob } from '@/types';
import {
  buildAgenda,
  dayLoad,
  diffDays,
  eur,
  eurShort,
  fertilizationInfo,
  findFirstFreeSlot,
  fmtDate,
  fmtDayLabel,
  fmtHours,
  fromISO,
  gcalLink,
  mapsLink,
  monthsAndDays,
  addDays,
  weekdayShort,
  whatsappLink,
  estimatedVisitHours,
  type AgendaItem,
} from '@/lib/utils';
import { SyncBadge } from '../AppShell';
import { Badge, Button, Card, EmptyState, Field, LinkButton, SectionTitle, Segmented, Sheet, cn, inputCls } from '../ui';

const PRIORITY_META: Record<JobPriority, { label: string; cls: string; order: number }> = {
  HIGH: { label: 'Urgente', cls: 'bg-red-100 text-red-800', order: 0 },
  MEDIUM: { label: 'Media', cls: 'bg-amber-100 text-amber-800', order: 1 },
  LOW: { label: 'Bassa', cls: 'bg-slate-200 text-slate-700', order: 2 },
};

interface GapState {
  client: Client;
  previousRecurrence: number;
  freedDate: string;
  freedHours: number;
  newDate: string;
  newRecurrence: number;
  insertedJobIds: string[];
}

export function AgendaTab() {
  const store = useStore();
  const { data, today, setTab, setCassaSection, setClientFilter, openCalculator, postponeVisit, notify } = store;
  const [gap, setGap] = useState<GapState | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const unpaid = data.interventions.filter((i) => i.paymentStatus === 'UNPAID');
  const unpaidTotal = unpaid.reduce((s, i) => s + i.totalAmount, 0);
  const unpaidClients = new Set(unpaid.map((i) => i.clientId)).size;
  const fertDue = data.clients.filter((c) => {
    const s = fertilizationInfo(c, today).status;
    return s === 'RED' || s === 'YELLOW';
  });
  const fertOverdue = fertDue.filter((c) => fertilizationInfo(c, today).status === 'RED').length;

  const agenda = useMemo(
    () => buildAgenda(data.clients, data.sporadicJobs, data.interventions, today, 14),
    [data.clients, data.sporadicJobs, data.interventions, today],
  );
  const overdueVisits = data.clients.filter((c) => c.nextVisitDate && c.nextVisitDate < today);

  const days = useMemo(() => {
    const groups = new Map<string, AgendaItem[]>();
    for (const it of agenda) {
      if (!groups.has(it.date)) groups.set(it.date, []);
      groups.get(it.date)!.push(it);
    }
    return [...groups.entries()];
  }, [agenda]);

  const pendingJobs = data.sporadicJobs
    .filter((j) => j.status === 'PENDING')
    .sort((a, b) => PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order);

  const handlePostpone = (client: Client) => {
    const res = postponeVisit(client.id);
    if (!res) return;
    setGap({ client, previousRecurrence: client.recurrenceWeeks, insertedJobIds: [], ...res });
  };

  const handleFirstFreeSlot = (job: SporadicJob) => {
    const date = findFirstFreeSlot(
      job.estimatedHours,
      data.clients,
      data.sporadicJobs,
      data.interventions,
      data.settings.workdayHours,
      today,
    );
    store.scheduleJob(job.id, date);
    notify(`“${job.title}” inserito ${fmtDayLabel(date, today).toLowerCase()}`);
  };

  return (
    <div className="animate-fade-in">
      {/* ── Hero riepilogo ───────────────────────────────── */}
      <section className="bg-emerald-950 px-4 pb-6 pt-1 text-white rounded-b-[2rem]">
        <div className="text-sm font-semibold text-emerald-300 capitalize">{fmtDayLabel(today, today)}</div>
        <h1 className="mt-0.5 text-2xl font-black leading-tight">Agenda &amp; Buchi</h1>
        <div className="mt-2">
          <SyncBadge />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setCassaSection('incassi');
              setTab('cassa');
            }}
            className="rounded-2xl bg-red-600 p-3 text-left shadow-lg shadow-red-950/30 transition active:scale-[0.97]"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-red-100">🔴 Da incassare</div>
            <div className="mt-1 text-2xl font-black tabular-nums">{eurShort(unpaidTotal)}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-red-100">
              {unpaidClients} {unpaidClients === 1 ? 'cliente' : 'clienti'} <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>
          <button
            onClick={() => {
              setClientFilter('FERT');
              setTab('clienti');
            }}
            className="rounded-2xl bg-amber-400 p-3 text-left text-amber-950 shadow-lg shadow-amber-950/30 transition active:scale-[0.97]"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide">⚠️ Concimazioni</div>
            <div className="mt-1 text-2xl font-black">
              {fertDue.length} <span className="text-base font-extrabold">giardini</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold">
              {fertOverdue} scadute · {fertDue.length - fertOverdue} in scadenza <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>
      </section>

      <div className="px-4">
        {/* ── Striscia carico settimana ─────────────────── */}
        <WeekStrip agenda={agenda} today={today} workday={data.settings.workdayHours} />

        {/* ── Visite da recuperare ──────────────────────── */}
        {overdueVisits.length > 0 && (
          <>
            <SectionTitle>
              <span className="flex items-center gap-2 text-red-700">
                <AlarmClock className="h-5 w-5" /> Da recuperare
              </span>
            </SectionTitle>
            <div className="space-y-3">
              {overdueVisits.map((c) => (
                <VisitCard
                  key={c.id}
                  client={c}
                  date={c.nextVisitDate}
                  actionable
                  overdue
                  estHours={estimatedVisitHours(c, data.interventions)}
                  onClose={() => openCalculator({ clientId: c.id })}
                  onPostpone={() => handlePostpone(c)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Timeline ──────────────────────────────────── */}
        <SectionTitle>Prossimi 14 giorni</SectionTitle>
        {days.length === 0 && (
          <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="Nessun appuntamento" text="Aggiungi clienti ricorrenti o lavori sporadici." />
        )}
        <div className="space-y-5">
          {days.map(([date, items]) => {
            const load = dayLoad(date, items);
            const free = Math.max(0, data.settings.workdayHours - load);
            const isToday = date === today;
            return (
              <div key={date}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className={cn('text-sm font-extrabold uppercase tracking-wide', isToday ? 'text-emerald-700' : 'text-slate-500')}>
                    {fmtDayLabel(date, today)}
                  </div>
                  <Badge className={free >= 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}>
                    <Clock className="h-3 w-3" /> {free > 0 ? `${fmtHours(free)} libere` : 'Pieno'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {items.map((it) =>
                    it.kind === 'VISIT' ? (
                      <VisitCard
                        key={it.key}
                        client={it.client}
                        date={it.date}
                        actionable={it.isNext}
                        estHours={it.estHours}
                        onClose={() => openCalculator({ clientId: it.client.id })}
                        onPostpone={() => handlePostpone(it.client)}
                      />
                    ) : (
                      <JobCard
                        key={it.key}
                        job={it.job}
                        onBill={() =>
                          openCalculator({
                            newClientName: it.job.clientName,
                            newClientPhone: it.job.phone,
                            hours: it.job.estimatedHours,
                            jobId: it.job.id,
                            notes: it.job.title,
                          })
                        }
                        onUnschedule={() => {
                          store.unscheduleJob(it.job.id);
                          notify('Lavoro rimesso in lista d’attesa', 'info');
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Lavori sporadici in attesa ─────────────────── */}
        <SectionTitle
          action={
            <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Aggiungi
            </Button>
          }
        >
          Lavori Sporadici in Attesa
        </SectionTitle>
        <p className="-mt-2 mb-3 text-sm text-slate-500">
          Il “Riempi-Buchi”: quando un cliente sposta una visita, te li propongo subito.
        </p>
        <div className="space-y-3">
          {pendingJobs.length === 0 && (
            <EmptyState icon={<Hammer className="h-6 w-6" />} title="Lista d’attesa vuota" text="Ottimo! Tutti i lavori extra sono in calendario." />
          )}
          {pendingJobs.map((job) => (
            <Card key={job.id} className="animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                  <Hammer className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={PRIORITY_META[job.priority].cls}>{PRIORITY_META[job.priority].label}</Badge>
                    <Badge className="bg-slate-100 text-slate-700">
                      <Clock className="h-3 w-3" /> {fmtHours(job.estimatedHours)}
                    </Badge>
                  </div>
                  <div className="mt-1.5 font-extrabold leading-snug text-slate-900">{job.title}</div>
                  <div className="text-sm text-slate-500">{job.clientName}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-emerald-700">{eurShort(job.estimatedPrice)}</div>
                  <div className="text-[11px] text-slate-400">stimati</div>
                </div>
              </div>
              <Button className="mt-3 w-full" variant="dark" onClick={() => handleFirstFreeSlot(job)}>
                <Zap className="h-5 w-5 text-amber-300" /> Inserisci nel primo spazio libero
              </Button>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <LinkButton size="sm" href={`tel:${job.phone.replace(/\s/g, '')}`}>
                  <Phone className="h-4 w-4" /> Chiama
                </LinkButton>
                <LinkButton
                  size="sm"
                  variant="whatsapp"
                  href={whatsappLink(job.phone, `Buongiorno ${job.clientName}, sono il giardiniere per il lavoro "${job.title}". Le confermo che posso passare a breve: le va bene?`)}
                >
                  <MessageCircle className="h-4 w-4" /> Scrivi
                </LinkButton>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => {
                    store.deleteJob(job.id);
                    notify('Lavoro eliminato', 'info');
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Elimina
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <FillGapSheet gap={gap} setGap={setGap} pendingJobs={pendingJobs} />
      <AddJobSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Striscia settimana con carico ore
// ─────────────────────────────────────────────────────────────

function WeekStrip({ agenda, today, workday }: { agenda: AgendaItem[]; today: string; workday: number }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  return (
    <div className="-mt-0 pt-4">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const load = dayLoad(d, agenda);
          const pct = Math.min(1, load / workday);
          const sunday = fromISO(d).getDay() === 0;
          return (
            <div
              key={d}
              className={cn(
                'flex flex-col items-center rounded-2xl bg-white px-1 py-2 ring-1 ring-slate-200',
                d === today && 'ring-2 ring-emerald-600',
              )}
            >
              <div className="text-[10px] font-bold uppercase text-slate-500">{weekdayShort(d)}</div>
              <div className="text-base font-black text-slate-900">{fromISO(d).getDate()}</div>
              <div className="mt-1 flex h-10 w-3 flex-col-reverse overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn('w-full rounded-full transition-all', sunday ? 'bg-slate-300' : pct >= 0.9 ? 'bg-emerald-700' : pct > 0 ? 'bg-emerald-500' : 'bg-transparent')}
                  style={{ height: `${pct * 100}%` }}
                />
              </div>
              <div className={cn('mt-1 text-[10px] font-bold', sunday ? 'text-slate-400' : pct < 0.5 ? 'text-amber-600' : 'text-slate-500')}>
                {sunday ? 'Riposo' : pct === 0 ? 'Libero' : `${Math.round(load * 10) / 10}h`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card visita ricorrente
// ─────────────────────────────────────────────────────────────

function VisitCard({
  client,
  date,
  actionable,
  overdue,
  estHours,
  onClose,
  onPostpone,
}: {
  client: Client;
  date: string;
  actionable: boolean;
  overdue?: boolean;
  estHours: number;
  onClose: () => void;
  onPostpone: () => void;
}) {
  const { data, today } = useStore();
  const fert = fertilizationInfo(client, today);
  const unpaid = data.interventions
    .filter((i) => i.clientId === client.id && i.paymentStatus === 'UNPAID')
    .reduce((s, i) => s + i.totalAmount, 0);

  if (!actionable) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 px-4 py-3">
        <Repeat className="h-5 w-5 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-700">{client.name}</div>
          <div className="text-xs text-slate-500">Ricorrenza prevista · ogni {client.recurrenceWeeks} sett. · ~{fmtHours(estHours)}</div>
        </div>
      </div>
    );
  }

  const elapsedMonths = client.lastFertilizationDate ? monthsAndDays(client.lastFertilizationDate, today).months : 0;
  const nextRec = Math.max(1, client.recurrenceWeeks) + 1;

  return (
    <Card className={cn('animate-fade-in', overdue && 'ring-2 ring-red-300')}>
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-lg font-black text-emerald-800">
          {client.name.replace(/^(sig\.ra|sig\.|dott\.|villa|condominio)\s*/i, '').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold leading-tight text-slate-900">{client.name}</div>
          <a href={mapsLink(client.address)} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 text-sm text-slate-500 underline-offset-2 hover:underline">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{client.address || 'Indirizzo non inserito'}</span>
          </a>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge className="bg-slate-100 text-slate-700">
              <Repeat className="h-3 w-3" /> {client.recurrenceWeeks > 0 ? `ogni ${client.recurrenceWeeks} sett.` : 'a chiamata'}
            </Badge>
            <Badge className="bg-slate-100 text-slate-700">
              <Clock className="h-3 w-3" /> ~{fmtHours(estHours)}
            </Badge>
            {overdue && <Badge className="bg-red-100 text-red-800">In ritardo di {diffDays(date, today)} gg</Badge>}
            {client.fixedMonthlyRate && <Badge className="bg-emerald-100 text-emerald-800">Canone {eurShort(client.fixedMonthlyRate)}/mese</Badge>}
          </div>
        </div>
      </div>

      {fert.status === 'RED' && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-800 ring-1 ring-red-200">
          <span className="text-lg">🌱</span> Concimazione fatta {elapsedMonths} mesi fa! Proponila oggi
        </div>
      )}
      {fert.status === 'YELLOW' && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
          <span className="text-lg">🌱</span> Concimazione in scadenza ({fert.elapsed}) — tra {fert.daysLeft} gg
        </div>
      )}
      {fert.status === 'NEVER' && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-700">
          <span className="text-lg">🌱</span> Nessuna concimazione registrata: chiedi al cliente
        </div>
      )}
      {unpaid > 0 && (
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2.5 text-sm font-bold text-orange-900 ring-1 ring-orange-200">
          <span className="text-lg">💶</span> Deve ancora {eur(unpaid)} — ricordalo oggi
        </div>
      )}
      {client.technicalNotes.sprinklerTypes && (
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
          <Wrench className="h-4 w-4 shrink-0" /> Carica sul furgone: {client.technicalNotes.sprinklerTypes}
        </div>
      )}

      <Button size="lg" className="mt-3 w-full" onClick={onClose}>
        <Calculator className="h-6 w-6" /> Chiudi Lavoro / Fai il Conto
      </Button>
      {client.recurrenceWeeks > 0 && (
        <Button variant="amber" className="mt-2 w-full" onClick={onPostpone}>
          <CalendarClock className="h-5 w-5" /> Sposta a {nextRec} Settimane (Crea Buco)
        </Button>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <LinkButton size="sm" href={mapsLink(client.address)}>
          <MapPin className="h-4 w-4" /> Naviga
        </LinkButton>
        <LinkButton size="sm" href={`tel:${client.phone.replace(/\s/g, '')}`}>
          <Phone className="h-4 w-4" /> Chiama
        </LinkButton>
        <LinkButton
          size="sm"
          href={gcalLink({
            title: `🌿 ${client.name} — manutenzione`,
            date,
            location: client.address,
            hours: estHours,
            details: `Visita ricorrente ogni ${client.recurrenceWeeks} settimane. ${client.technicalNotes.notes ?? ''}`,
          })}
        >
          <CalendarPlus className="h-4 w-4" /> GCal
        </LinkButton>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Card lavoro sporadico in calendario
// ─────────────────────────────────────────────────────────────

function JobCard({ job, onBill, onUnschedule }: { job: SporadicJob; onBill: () => void; onUnschedule: () => void }) {
  return (
    <Card className="animate-fade-in bg-amber-50 ring-amber-200">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-400 text-amber-950">
          <Hammer className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <Badge className="bg-amber-200 text-amber-900">
            <Sparkles className="h-3 w-3" /> Lavoro sporadico · buco riempito
          </Badge>
          <div className="mt-1 font-extrabold leading-snug text-slate-900">{job.title}</div>
          <div className="text-sm text-slate-600">
            {job.clientName} · ~{fmtHours(job.estimatedHours)} · {eurShort(job.estimatedPrice)}
          </div>
        </div>
      </div>
      <Button className="mt-3 w-full" onClick={onBill}>
        <Calculator className="h-5 w-5" /> Fatto: Fai il Conto
      </Button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <LinkButton
          size="sm"
          href={gcalLink({ title: `🔨 ${job.title} — ${job.clientName}`, date: job.scheduledDate!, hours: job.estimatedHours })}
        >
          <CalendarPlus className="h-4 w-4" /> Google Calendar
        </LinkButton>
        <Button size="sm" variant="outline" onClick={onUnschedule}>
          <Undo2 className="h-4 w-4" /> Rimetti in attesa
        </Button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Drawer intelligente "Riempi-Buchi"
// ─────────────────────────────────────────────────────────────

function FillGapSheet({
  gap,
  setGap,
  pendingJobs,
}: {
  gap: GapState | null;
  setGap: (g: GapState | null) => void;
  pendingJobs: SporadicJob[];
}) {
  const { scheduleJob, unscheduleJob, updateClient, notify, data, today } = useStore();
  if (!gap) return null;

  const usedHours = gap.insertedJobIds.reduce(
    (s, id) => s + (data.sporadicJobs.find((j) => j.id === id)?.estimatedHours ?? 0),
    0,
  );
  const remaining = Math.max(0, gap.freedHours - usedHours);
  const halfDay = gap.freedHours >= 3.5;
  const sorted = [...pendingJobs].sort((a, b) => {
    const ca = a.estimatedHours <= remaining ? 0 : 1;
    const cb = b.estimatedHours <= remaining ? 0 : 1;
    return ca - cb || PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order || b.estimatedPrice - a.estimatedPrice;
  });
  const inserted = gap.insertedJobIds
    .map((id) => data.sporadicJobs.find((j) => j.id === id))
    .filter((j): j is SporadicJob => !!j);

  const insert = (job: SporadicJob) => {
    scheduleJob(job.id, gap.freedDate);
    setGap({ ...gap, insertedJobIds: [...gap.insertedJobIds, job.id] });
    notify(`Buco riempito: “${job.title}” il ${fmtDate(gap.freedDate)}`);
  };

  const undo = () => {
    updateClient(gap.client.id, { nextVisitDate: gap.freedDate, recurrenceWeeks: gap.previousRecurrence });
    gap.insertedJobIds.forEach((id) => unscheduleJob(id));
    setGap(null);
    notify('Spostamento annullato', 'info');
  };

  return (
    <Sheet
      open
      onClose={() => setGap(null)}
      tone="emerald"
      icon={<Sparkles className="h-8 w-8 text-amber-300" />}
      title={halfDay ? 'Hai liberato mezza giornata!' : `Hai liberato ${fmtHours(gap.freedHours)}!`}
      subtitle={
        <>
          {gap.client.name} passa a <b>ogni {gap.newRecurrence} settimane</b>: prossima visita il {fmtDate(gap.newDate)}.
          Vuoi inserire un lavoro sporadico {fmtDayLabel(gap.freedDate, today).toLowerCase()}?
        </>
      }
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button variant="outline" onClick={undo}>
            <Undo2 className="h-5 w-5" /> Annulla
          </Button>
          <Button variant="dark" onClick={() => setGap(null)}>
            <CheckCircle2 className="h-5 w-5" /> {inserted.length ? 'Fatto' : 'Lascia libero'}
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex items-center justify-between text-sm font-bold text-slate-600">
          <span>Ore libere {fmtDayLabel(gap.freedDate, today).split('·')[0].toLowerCase()}</span>
          <span className="text-emerald-700">
            {fmtHours(remaining)} / {fmtHours(gap.freedHours)}
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-emerald-100">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${Math.min(100, (usedHours / gap.freedHours) * 100)}%` }}
          />
        </div>
      </div>

      {inserted.length > 0 && (
        <div className="mb-4 space-y-2">
          {inserted.map((j) => (
            <div key={j.id} className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200 animate-pop">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> {j.title} · {j.clientName}
            </div>
          ))}
        </div>
      )}

      <div className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">Lavori in attesa</div>
      {sorted.length === 0 && <EmptyState icon={<Hammer className="h-6 w-6" />} title="Nessun lavoro in attesa" />}
      <div className="space-y-2">
        {sorted.map((job) => {
          const fits = job.estimatedHours <= remaining;
          return (
            <button
              key={job.id}
              onClick={() => insert(job)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98]',
                fits ? 'bg-white ring-2 ring-emerald-500 shadow-sm' : 'bg-white/70 ring-1 ring-slate-200 opacity-80',
              )}
            >
              <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', fits ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500')}>
                <Plus className="h-6 w-6" strokeWidth={3} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold leading-snug text-slate-900">{job.title}</div>
                <div className="text-xs text-slate-500">
                  {job.clientName} · {fmtHours(job.estimatedHours)} · {eurShort(job.estimatedPrice)}
                </div>
                <div className={cn('mt-1 text-xs font-bold', fits ? 'text-emerald-700' : 'text-amber-700')}>
                  {fits ? '✓ Ci sta nel buco' : `Sfora di ${fmtHours(job.estimatedHours - remaining)}`}
                </div>
              </div>
              <Badge className={PRIORITY_META[job.priority].cls}>{PRIORITY_META[job.priority].label}</Badge>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Form nuovo lavoro sporadico
// ─────────────────────────────────────────────────────────────

function AddJobSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addJob, notify } = useStore();
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('2');
  const [price, setPrice] = useState('');
  const [priority, setPriority] = useState<JobPriority>('MEDIUM');

  const presets = ['Potatura siepe alta', 'Abbattimento albero', 'Pulizia grondaia', 'Riparazione impianto irrigazione', 'Semina prato'];

  const reset = () => {
    setTitle('');
    setClientName('');
    setPhone('');
    setHours('2');
    setPrice('');
    setPriority('MEDIUM');
  };

  const valid = title.trim() && clientName.trim() && parseFloat(hours.replace(',', '.')) > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuovo Lavoro Sporadico"
      subtitle="Finisce nella lista d’attesa Riempi-Buchi"
      icon={<Hammer className="h-7 w-7 text-amber-600" />}
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={!valid}
          onClick={() => {
            addJob({
              title: title.trim(),
              clientName: clientName.trim(),
              phone: phone.trim(),
              estimatedHours: parseFloat(hours.replace(',', '.')) || 1,
              estimatedPrice: parseFloat(price.replace(',', '.')) || 0,
              priority,
            });
            notify('Lavoro aggiunto alla lista d’attesa');
            reset();
            onClose();
          }}
        >
          <Plus className="h-5 w-5" /> Aggiungi alla lista
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Lavoro">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Potatura siepe alta" />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button key={p} onClick={() => setTitle(p)} className="min-h-9 rounded-xl bg-white px-3 text-xs font-bold text-slate-700 ring-1 ring-slate-200 active:scale-95">
              {p}
            </button>
          ))}
        </div>
        <Field label="Cliente">
          <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Es. Sig. Greco" />
        </Field>
        <Field label="Telefono">
          <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 ..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ore stimate">
            <input className={inputCls} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
          <Field label="Prezzo stimato (€)">
            <input className={inputCls} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <Field label="Priorità">
          <Segmented
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'HIGH', label: 'Urgente' },
              { value: 'MEDIUM', label: 'Media' },
              { value: 'LOW', label: 'Bassa' },
            ]}
          />
        </Field>
      </div>
    </Sheet>
  );
}
