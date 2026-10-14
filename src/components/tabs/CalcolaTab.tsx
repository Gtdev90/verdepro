'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  HandCoins,
  Landmark,
  Leaf,
  Minus,
  Plus,
  Receipt,
  Smartphone,
  Sprout,
  Trash2,
  Truck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { QUICK_EXTRAS } from '@/data/seed';
import { useStore } from '@/store/AppStore';
import type { ExtraItem, Intervention, PaymentMethod } from '@/types';
import { computeBill, eur, fertilizationInfo, fmtDate, fmtHours, uid } from '@/lib/utils';
import { Badge, Button, Card, Field, Sheet, Stepper, Toggle, cn, inputCls } from '../ui';

const WASTE_PRESETS = [
  { label: 'Piccolo', amount: 20 },
  { label: 'Medio', amount: 40 },
  { label: 'Camion', amount: 70 },
];

const METHOD_META: Record<PaymentMethod, { label: string; icon: typeof Banknote }> = {
  CASH: { label: 'Contanti', icon: Banknote },
  TRANSFER: { label: 'Bonifico', icon: Landmark },
  POS: { label: 'POS / Carta', icon: CreditCard },
};

export function CalcolaTab() {
  const { data, today, calcPrefill, clearCalcPrefill, saveIntervention, notify, setImmersive, setTab } = useStore();
  const s = data.settings;

  // Stato iniziale: eventuale pre-selezione dall'Agenda, altrimenti il primo cliente di oggi
  const [clientId, setClientId] = useState<string>(() => {
    if (calcPrefill?.clientId) return calcPrefill.clientId;
    if (calcPrefill?.newClientName) return 'NEW';
    return data.clients.find((c) => c.nextVisitDate === today)?.id ?? '';
  });
  const [newName, setNewName] = useState(calcPrefill?.newClientName ?? '');
  const [newPhone, setNewPhone] = useState(calcPrefill?.newClientPhone ?? '');
  const [jobId, setJobId] = useState<string | undefined>(calcPrefill?.jobId);
  const [workers, setWorkers] = useState(s.defaultWorkers);
  const [hours, setHours] = useState(calcPrefill?.hours ?? 2);
  const [rate, setRate] = useState(String(s.defaultHourlyRate));
  const [wasteOn, setWasteOn] = useState(false);
  const [waste, setWaste] = useState(40);
  const [wasteCustom, setWasteCustom] = useState('');
  const [fertOn, setFertOn] = useState(false);
  const [fertPrice, setFertPrice] = useState(String(s.defaultFertilizationPrice));
  const [extras, setExtras] = useState<ExtraItem[]>([]);
  const [notes, setNotes] = useState(calcPrefill?.notes ?? '');
  const [freeOpen, setFreeOpen] = useState(false);
  const [freeName, setFreeName] = useState('');
  const [freePrice, setFreePrice] = useState('');
  const [freeCost, setFreeCost] = useState('');

  const [customerView, setCustomerView] = useState(false);
  const [showRates, setShowRates] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [saved, setSaved] = useState<Intervention | null>(null);

  // La pre-selezione si consuma una volta sola
  useEffect(() => {
    if (calcPrefill) clearCalcPrefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setImmersive(customerView);
    return () => setImmersive(false);
  }, [customerView, setImmersive]);

  const client = data.clients.find((c) => c.id === clientId);
  const fert = client ? fertilizationInfo(client, today) : null;
  const rateNum = parseFloat(rate.replace(',', '.')) || 0;
  const fertNum = parseFloat(fertPrice.replace(',', '.')) || 0;

  const bill = useMemo(
    () =>
      computeBill({
        workersCount: workers,
        hoursWorked: hours,
        hourlyRatePerWorker: rateNum,
        wasteDisposalCost: wasteOn ? waste : 0,
        fertilizationApplied: fertOn,
        fertilizationCost: fertNum,
        extraItems: extras,
      }),
    [workers, hours, rateNum, wasteOn, waste, fertOn, fertNum, extras],
  );

  const groupedExtras = useMemo(() => {
    const map = new Map<string, { key: string; name: string; unit: number; cost: number; qty: number; ids: string[] }>();
    for (const x of extras) {
      const key = `${x.name}|${x.priceToClient}|${x.costToMe}`;
      const g = map.get(key) ?? { key, name: x.name, unit: x.priceToClient, cost: x.costToMe, qty: 0, ids: [] };
      g.qty++;
      g.ids.push(x.id);
      map.set(key, g);
    }
    return [...map.values()];
  }, [extras]);

  const canSave = (clientId && clientId !== 'NEW') || (clientId === 'NEW' && newName.trim().length > 1);
  const displayName = clientId === 'NEW' ? newName.trim() || 'Nuovo cliente' : client?.name ?? '—';

  const addExtra = (name: string, costToMe: number, priceToClient: number) =>
    setExtras((e) => [...e, { id: uid('x'), name, costToMe, priceToClient }]);

  const resetForm = () => {
    setClientId('');
    setNewName('');
    setNewPhone('');
    setJobId(undefined);
    setWorkers(s.defaultWorkers);
    setHours(2);
    setRate(String(s.defaultHourlyRate));
    setWasteOn(false);
    setWaste(40);
    setWasteCustom('');
    setFertOn(false);
    setFertPrice(String(s.defaultFertilizationPrice));
    setExtras([]);
    setNotes('');
  };

  const doSave = (status: 'PAID' | 'UNPAID', method?: PaymentMethod) => {
    if (!canSave) {
      notify('Scegli prima il cliente', 'warning');
      return;
    }
    const intervention = saveIntervention({
      clientId: clientId === 'NEW' ? undefined : clientId,
      newClient: clientId === 'NEW' ? { name: newName, phone: newPhone } : undefined,
      jobId,
      date: today,
      workersCount: workers,
      hoursWorked: hours,
      hourlyRatePerWorker: rateNum,
      wasteDisposalCost: wasteOn ? waste : 0,
      fertilizationApplied: fertOn,
      fertilizationCost: fertOn ? fertNum : 0,
      extraItems: extras,
      totalAmount: bill.total,
      paymentStatus: status,
      paymentMethod: method,
      notes: notes.trim() || undefined,
    });
    setPayOpen(false);
    setCustomerView(false);
    setSaved(intervention);
    notify(
      status === 'PAID'
        ? `Incassati ${eur(bill.total)} (${METHOD_META[method ?? 'CASH'].label})`
        : `${eur(bill.total)} aggiunti ai sospesi di ${intervention.clientName}`,
      status === 'PAID' ? 'success' : 'warning',
    );
    if (fertOn) setTimeout(() => notify('🌱 Scadenziario concimazione aggiornato a oggi', 'info'), 600);
    resetForm();
  };

  // ── Schermata di conferma ──────────────────────────────────
  if (saved) {
    const paid = saved.paymentStatus === 'PAID';
    return (
      <div className="px-4 pt-8 animate-fade-in">
        <div className={cn('rounded-[2rem] p-6 text-center text-white shadow-xl', paid ? 'bg-emerald-600' : 'bg-amber-500 text-amber-950')}>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/20 animate-pop">
            {paid ? <CheckCircle2 className="h-12 w-12" /> : <HandCoins className="h-12 w-12" />}
          </div>
          <div className="mt-4 text-sm font-bold uppercase tracking-wide opacity-90">{paid ? 'Pagato e registrato' : 'Salvato a credito'}</div>
          <div className="mt-1 text-5xl font-black tabular-nums">{eur(saved.totalAmount)}</div>
          <div className="mt-2 text-lg font-bold">{saved.clientName}</div>
          <div className="text-sm opacity-90">
            {fmtDate(saved.date)}
            {paid && saved.paymentMethod ? ` · ${METHOD_META[saved.paymentMethod].label}` : ' · da incassare'}
          </div>
          {saved.fertilizationApplied && (
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
              <Sprout className="h-4 w-4" /> Concimazione registrata: timer ripartito
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-2">
          <Button size="lg" variant="dark" onClick={() => setSaved(null)}>
            <Plus className="h-5 w-5" /> Nuovo conto
          </Button>
          <Button size="lg" variant="outline" onClick={() => setTab(paid ? 'agenda' : 'cassa')}>
            {paid ? (
              <>
                <CalendarDays className="h-5 w-5" /> Torna all’Agenda
              </>
            ) : (
              <>
                <HandCoins className="h-5 w-5" /> Vedi chi deve pagare
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ── Barra superiore con totale live (sempre visibile) ── */}
      <section className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-20 bg-emerald-950 px-4 pb-3 pt-1 text-white rounded-b-[1.75rem] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-emerald-300">Calcola Conto · {displayName}</div>
            <div key={bill.total} className="text-3xl font-black tabular-nums leading-tight animate-pop">
              {eur(bill.total)}
            </div>
          </div>
          <Button
            variant="amber"
            className="shrink-0"
            onClick={() => {
              if (!canSave) {
                notify('Scegli prima il cliente', 'warning');
                return;
              }
              setCustomerView(true);
            }}
          >
            <Smartphone className="h-5 w-5" />
            <span className="text-left text-sm leading-tight">
              MOSTRA AL
              <br />
              CLIENTE
            </span>
          </Button>
        </div>
      </section>


      <div className="space-y-4 px-4 pt-4">
        {/* ── Cliente ───────────────────────────────────── */}
        <Card>
          <Field label="Cliente">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={cn(inputCls, 'min-h-14 appearance-none text-lg font-bold')}
            >
              <option value="">— Scegli cliente —</option>
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.nextVisitDate === today ? ' · oggi' : ''}
                </option>
              ))}
              <option value="NEW">➕ Nuovo Cliente al volo</option>
            </select>
          </Field>
          {clientId === 'NEW' && (
            <div className="mt-3 grid gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <UserPlus className="h-4 w-4" /> Verrà creato al salvataggio
              </div>
              <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome (es. Sig. Greco)" />
              <input className={inputCls} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} inputMode="tel" placeholder="Telefono (per WhatsApp)" />
            </div>
          )}
          {jobId && (
            <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 ring-1 ring-amber-200">
              🔨 Conto del lavoro sporadico: verrà tolto dalla lista d’attesa
            </div>
          )}
          {client && fert && (fert.status === 'RED' || fert.status === 'YELLOW' || fert.status === 'NEVER') && !fertOn && (
            <button
              onClick={() => setFertOn(true)}
              className={cn(
                'mt-3 flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-bold ring-1 transition active:scale-[0.98]',
                fert.status === 'RED' ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-amber-50 text-amber-900 ring-amber-200',
              )}
            >
              <span className="text-lg">🌱</span>
              <span className="flex-1">
                {fert.status === 'NEVER' ? 'Mai concimato' : `Ultima concimazione ${fert.elapsed}`} — tocca per aggiungerla
              </span>
              <Plus className="h-5 w-5" />
            </button>
          )}
        </Card>

        {/* ── Manodopera ────────────────────────────────── */}
        <Card>
          <div className="mb-3 flex items-center gap-2 text-base font-extrabold text-emerald-950">
            <Users className="h-5 w-5 text-emerald-600" /> Manodopera
          </div>
          <div className="space-y-4">
            <Stepper label="Numero operai" value={workers} onChange={setWorkers} min={1} max={10} quick={[1, 2, 3, 4]} />
            <Stepper
              label="Ore svolte"
              value={hours}
              onChange={setHours}
              step={0.5}
              min={0.5}
              max={12}
              format={fmtHours}
              quick={[1, 1.5, 2, 2.5, 3, 4, 5, 8]}
            />
            <Field label="Tariffa oraria per operaio (€/h)">
              <div className="flex gap-2">
                <input
                  className={cn(inputCls, 'min-h-14 text-2xl font-black')}
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
                {[25, 30, 35].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRate(String(r))}
                    className={cn(
                      'min-h-14 min-w-14 rounded-2xl text-base font-black transition active:scale-95',
                      rateNum === r ? 'bg-emerald-950 text-white' : 'bg-white text-slate-700 ring-2 ring-slate-200',
                    )}
                  >
                    {r}€
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <span className="text-sm font-bold text-emerald-900">
              {workers} {workers === 1 ? 'operaio' : 'operai'} × {fmtHours(hours)} × {eur(rateNum, 0)}
            </span>
            <span key={bill.labor} className="text-xl font-black tabular-nums text-emerald-800 animate-pop">
              = {eur(bill.labor)}
            </span>
          </div>
        </Card>

        {/* ── Opzioni & materiali ───────────────────────── */}
        <Card>
          <div className="mb-1 flex items-center gap-2 text-base font-extrabold text-emerald-950">
            <Leaf className="h-5 w-5 text-emerald-600" /> Opzioni &amp; Materiali
          </div>

          <div className="divide-y divide-slate-100">
            <div className="py-2">
              <Toggle
                checked={wasteOn}
                onChange={setWasteOn}
                label="Smaltimento Materiale / Ramaglie"
                description={wasteOn ? `+ ${eur(waste)}` : 'Sfalci, potature, ramaglie'}
                icon={<Truck className="h-6 w-6 text-slate-500" />}
              />
              {wasteOn && (
                <div className="mt-2 animate-fade-in">
                  <div className="grid grid-cols-3 gap-2">
                    {WASTE_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          setWaste(p.amount);
                          setWasteCustom('');
                        }}
                        className={cn(
                          'min-h-14 rounded-2xl text-sm font-black transition active:scale-95',
                          waste === p.amount && !wasteCustom ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800',
                        )}
                      >
                        {p.label}
                        <span className="block text-base">+{p.amount}€</span>
                      </button>
                    ))}
                  </div>
                  <input
                    className={cn(inputCls, 'mt-2')}
                    inputMode="decimal"
                    placeholder="Importo libero (€)"
                    value={wasteCustom}
                    onChange={(e) => {
                      setWasteCustom(e.target.value);
                      const n = parseFloat(e.target.value.replace(',', '.'));
                      if (Number.isFinite(n)) setWaste(n);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="py-2">
              <Toggle
                checked={fertOn}
                onChange={setFertOn}
                label="Concimazione Effettuata Oggi"
                description={fertOn ? `+ ${eur(fertNum)} · aggiorna lo scadenziario` : 'Riparte il timer del cliente'}
                icon={<Sprout className="h-6 w-6 text-emerald-600" />}
              />
              {fertOn && (
                <div className="mt-2 flex gap-2 animate-fade-in">
                  <input
                    className={cn(inputCls, 'text-xl font-black')}
                    inputMode="decimal"
                    value={fertPrice}
                    onChange={(e) => setFertPrice(e.target.value)}
                  />
                  {[35, 45, 60].map((v) => (
                    <button
                      key={v}
                      onClick={() => setFertPrice(String(v))}
                      className={cn(
                        'min-h-12 min-w-14 rounded-2xl text-sm font-black active:scale-95',
                        fertNum === v ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800',
                      )}
                    >
                      +{v}€
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3">
              <div className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Ricambi / Extra</div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_EXTRAS.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => addExtra(q.name, q.costToMe, q.priceToClient)}
                    className="min-h-14 rounded-2xl bg-sky-50 px-3 text-left text-sm font-black text-sky-900 ring-1 ring-sky-200 transition active:scale-95"
                  >
                    {q.label}
                    <span className="block text-xs font-bold text-sky-700">{eur(q.priceToClient, 0)} al cliente</span>
                  </button>
                ))}
                <button
                  onClick={() => setFreeOpen(true)}
                  className="min-h-14 rounded-2xl bg-white px-3 text-left text-sm font-black text-slate-800 ring-2 ring-dashed ring-slate-300 transition active:scale-95"
                >
                  + Voce libera
                  <span className="block text-xs font-bold text-slate-500">nome e prezzo</span>
                </button>
              </div>

              {groupedExtras.length > 0 && (
                <div className="mt-3 space-y-2">
                  {groupedExtras.map((g) => (
                    <div key={g.key} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200 animate-fade-in">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-slate-900">{g.name}</div>
                        <div className="text-xs text-slate-500">
                          {eur(g.unit)} cad. · costo mio {eur(g.cost)}
                        </div>
                      </div>
                      <button
                        onClick={() => setExtras((e) => e.filter((x) => x.id !== g.ids[g.ids.length - 1]))}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-slate-200 active:scale-95"
                        aria-label="Togli uno"
                      >
                        {g.qty === 1 ? <Trash2 className="h-4 w-4 text-red-600" /> : <Minus className="h-4 w-4" />}
                      </button>
                      <span className="w-6 text-center font-black tabular-nums">{g.qty}</span>
                      <button
                        onClick={() => addExtra(g.name, g.cost, g.unit)}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white active:scale-95"
                        aria-label="Aggiungi uno"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="w-20 text-right font-black tabular-nums">{eur(g.unit * g.qty)}</span>
                    </div>
                  ))}
                  <div className="text-right text-xs font-semibold text-slate-500">
                    Margine sui materiali (solo per te): <span className="text-emerald-700">{eur(bill.materialMargin)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <Field label="Note (facoltative)">
            <textarea
              className={cn(inputCls, 'min-h-20 py-3')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. potata siepe lato strada, sostituito ugello settore 3"
            />
          </Field>
        </Card>

        {/* ── Riepilogo + salvataggio ───────────────────── */}
        <Card className="bg-emerald-950 text-white ring-emerald-900">
          <BillLines
            workers={workers}
            hours={hours}
            rate={rateNum}
            bill={bill}
            wasteOn={wasteOn}
            fertOn={fertOn}
            extras={groupedExtras}
            showRates
            dark
          />
        </Card>

        <div className="grid gap-3 pb-4">
          <Button size="xl" className="w-full" disabled={!canSave || bill.total <= 0} onClick={() => setPayOpen(true)}>
            <CheckCircle2 className="h-7 w-7" /> SALVA COME PAGATO
          </Button>
          <Button size="xl" variant="amber" className="w-full" disabled={!canSave || bill.total <= 0} onClick={() => doSave('UNPAID')}>
            <HandCoins className="h-7 w-7" /> SALVA DA PAGARE (A CREDITO)
          </Button>
          {!canSave && <p className="text-center text-sm font-semibold text-slate-500">Seleziona un cliente per salvare</p>}
        </div>
      </div>

      {/* ── Modalità "Mostra al Cliente" ──────────────────── */}
      {customerView && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-emerald-50 to-white animate-fade-in">
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCustomerView(false)}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" /> Modifica
              </button>
              <button
                onClick={() => setShowRates((v) => !v)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-bold text-slate-500 ring-1 ring-slate-200 active:scale-95"
              >
                {showRates ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showRates ? 'Nascondi tariffe' : 'Mostra tariffe'}
              </button>
            </div>

            <div className="mt-5 flex-1">
              <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-emerald-100">
                <div className="flex items-center gap-3 border-b-2 border-dashed border-slate-200 pb-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white">
                    <Leaf className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-700">Riepilogo intervento</div>
                    <div className="text-2xl font-black text-slate-900">{displayName}</div>
                    <div className="text-sm font-semibold text-slate-500">{fmtDate(today)}</div>
                  </div>
                </div>
                <div className="py-4">
                  <BillLines
                    workers={workers}
                    hours={hours}
                    rate={rateNum}
                    bill={bill}
                    wasteOn={wasteOn}
                    fertOn={fertOn}
                    extras={groupedExtras}
                    showRates={showRates}
                    large
                  />
                </div>
                {notes.trim() && <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{notes}</div>}
                <div className="mt-4 text-center text-xs font-semibold text-slate-400">Grazie per la fiducia 🌿</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                onClick={() => setPayOpen(true)}
                className="min-h-24 rounded-[1.75rem] bg-emerald-600 text-3xl font-black tracking-tight text-white shadow-xl shadow-emerald-900/30 transition active:scale-[0.97]"
              >
                ✅ PAGATO ORA
              </button>
              <button
                onClick={() => doSave('UNPAID')}
                className="min-h-24 rounded-[1.75rem] bg-amber-400 text-2xl font-black tracking-tight text-amber-950 shadow-xl shadow-amber-900/20 transition active:scale-[0.97]"
              >
                🕓 DA PAGARE (SOSPESO)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Metodo di pagamento ───────────────────────────── */}
      <Sheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        tone="emerald"
        title={`Incassa ${eur(bill.total)}`}
        subtitle={`${displayName} · come ha pagato?`}
        icon={<Receipt className="h-8 w-8" />}
      >
        <div className="grid gap-3">
          {(Object.keys(METHOD_META) as PaymentMethod[]).map((m) => {
            const Icon = METHOD_META[m].icon;
            return (
              <button
                key={m}
                onClick={() => doSave('PAID', m)}
                className="flex min-h-20 items-center gap-4 rounded-3xl bg-white px-5 text-left text-xl font-black text-slate-900 ring-2 ring-slate-200 transition hover:ring-emerald-500 active:scale-[0.98]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Icon className="h-7 w-7" />
                </span>
                {METHOD_META[m].label}
              </button>
            );
          })}
        </div>
      </Sheet>

      {/* ── Voce libera ───────────────────────────────────── */}
      <Sheet
        open={freeOpen}
        onClose={() => setFreeOpen(false)}
        title="Voce libera"
        subtitle="Ricambio o materiale extra"
        icon={<Plus className="h-7 w-7 text-emerald-600" />}
        footer={
          <Button
            size="lg"
            className="w-full"
            disabled={!freeName.trim() || !(parseFloat(freePrice.replace(',', '.')) > 0)}
            onClick={() => {
              addExtra(freeName.trim(), parseFloat(freeCost.replace(',', '.')) || 0, parseFloat(freePrice.replace(',', '.')) || 0);
              setFreeName('');
              setFreePrice('');
              setFreeCost('');
              setFreeOpen(false);
            }}
          >
            <Plus className="h-5 w-5" /> Aggiungi al conto
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label="Descrizione">
            <input className={inputCls} value={freeName} onChange={(e) => setFreeName(e.target.value)} placeholder="Es. Elettrovalvola 24V" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prezzo al cliente (€)">
              <input className={inputCls} inputMode="decimal" value={freePrice} onChange={(e) => setFreePrice(e.target.value)} />
            </Field>
            <Field label="Costo mio (€)" hint="Facoltativo, non visibile al cliente">
              <input className={inputCls} inputMode="decimal" value={freeCost} onChange={(e) => setFreeCost(e.target.value)} />
            </Field>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Righe del conto (riusate in riepilogo e vista cliente)
// ─────────────────────────────────────────────────────────────

function BillLines({
  workers,
  hours,
  rate,
  bill,
  wasteOn,
  fertOn,
  extras,
  showRates,
  large,
  dark,
}: {
  workers: number;
  hours: number;
  rate: number;
  bill: ReturnType<typeof computeBill>;
  wasteOn: boolean;
  fertOn: boolean;
  extras: { key: string; name: string; unit: number; qty: number }[];
  showRates: boolean;
  large?: boolean;
  dark?: boolean;
}) {
  const row = cn('flex items-baseline justify-between gap-3', large ? 'text-lg' : 'text-sm');
  const sub = dark ? 'text-emerald-300' : 'text-slate-500';
  return (
    <div className={cn('space-y-2.5', dark ? 'text-emerald-50' : 'text-slate-800')}>
      <div className={row}>
        <span>
          <span className="font-bold">Manodopera</span>
          <span className={cn('block text-xs font-semibold', sub)}>
            <Clock className="mr-1 inline h-3 w-3" />
            {workers} {workers === 1 ? 'operaio' : 'operai'} × {fmtHours(hours)}
            {showRates && ` × ${eur(rate, 0)}/h`}
          </span>
        </span>
        <span className="font-bold tabular-nums">{eur(bill.labor)}</span>
      </div>
      {wasteOn && (
        <div className={row}>
          <span className="font-bold">Smaltimento ramaglie</span>
          <span className="font-bold tabular-nums">{eur(bill.waste)}</span>
        </div>
      )}
      {fertOn && (
        <div className={row}>
          <span className="font-bold">Concimazione</span>
          <span className="font-bold tabular-nums">{eur(bill.fert)}</span>
        </div>
      )}
      {extras.map((x) => (
        <div key={x.key} className={row}>
          <span className="font-bold">
            {x.name}
            {x.qty > 1 && <span className={cn('ml-1 font-semibold', sub)}>× {x.qty}</span>}
          </span>
          <span className="font-bold tabular-nums">{eur(x.unit * x.qty)}</span>
        </div>
      ))}
      <div className={cn('mt-2 flex items-end justify-between border-t-2 pt-3', dark ? 'border-emerald-800' : 'border-slate-900')}>
        <span className={cn('font-black uppercase', large ? 'text-lg' : 'text-sm')}>Totale da pagare</span>
        <span key={bill.total} className={cn('font-black tabular-nums animate-pop', large ? 'text-5xl text-emerald-700' : 'text-3xl')}>
          {eur(bill.total)}
        </span>
      </div>
      {!large && bill.extras > 0 && (
        <div className={cn('flex justify-end', sub)}>
          <Badge className="bg-emerald-900 text-emerald-200">
            <X className="h-3 w-3 rotate-45" /> materiali {eur(bill.extras)}
          </Badge>
        </div>
      )}
    </div>
  );
}
