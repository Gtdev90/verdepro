'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  HandCoins,
  History,
  Landmark,
  MessageCircle,
  Mic,
  Package,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  Volume2,
  Wallet,
  Zap,
} from 'lucide-react';
import { QUICK_EXPENSES } from '@/data/seed';
import { useStore } from '@/store/AppStore';
import type { CassaSection, Expense, ExpenseCategory, Intervention, PaymentMethod } from '@/types';
import {
  CATEGORY_META,
  eur,
  eurShort,
  expensesInLastYear,
  fmtDate,
  fmtDateShort,
  interventionSummary,
  parseQuickExpenses,
  reminderMessage,
  round2,
  whatsappLink,
} from '@/lib/utils';

import { Badge, Button, Card, EmptyState, Field, LinkButton, SectionTitle, Segmented, Sheet, cn, inputCls } from '../ui';

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
  CASH: Banknote,
  TRANSFER: Landmark,
  POS: CreditCard,
};

export function CassaTab() {
  const { data, today, cassaSection, setCassaSection, markPaid, markUnpaid, addExpenses, deleteExpense, notify } = useStore();

  // Dialog incasso rapido
  const [incassoIntervention, setIncassoIntervention] = useState<Intervention | null>(null);

  // Spese quick-add input
  const [quickInput, setQuickInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [manualExpenseOpen, setManualExpenseOpen] = useState(false);

  // Sospesi (UNPAID)
  const unpaidInterventions = useMemo(() => {
    return data.interventions
      .filter((i) => i.paymentStatus === 'UNPAID')
      .sort((a, b) => a.date.localeCompare(b.date)); // I più vecchi in cima per sollecito
  }, [data.interventions]);

  const unpaidTotal = useMemo(() => {
    return unpaidInterventions.reduce((s, i) => s + i.totalAmount, 0);
  }, [unpaidInterventions]);

  // Pagati (PAID)
  const paidInterventions = useMemo(() => {
    return data.interventions
      .filter((i) => i.paymentStatus === 'PAID')
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.interventions]);

  const paidYearTotal = useMemo(() => {
    const curYear = today.slice(0, 4);
    return paidInterventions
      .filter((i) => i.date.startsWith(curYear))
      .reduce((s, i) => s + i.totalAmount, 0);
  }, [paidInterventions, today]);

  // Spese ultimo anno
  const yearExpenses = useMemo(() => expensesInLastYear(data.expenses, today), [data.expenses, today]);
  const yearExpensesTotal = useMemo(() => yearExpenses.reduce((s, e) => s + e.amount, 0), [yearExpenses]);

  // Spesa Concime vs Micro-spese (irrigazione, bar)
  const concimeTotal = useMemo(() => {
    return yearExpenses.filter((e) => e.category === 'CONCIME').reduce((s, e) => s + e.amount, 0);
  }, [yearExpenses]);

  const microSpeseTotal = useMemo(() => {
    return yearExpenses
      .filter((e) => e.category === 'IRRIGAZIONE' || e.category === 'PASTI_BAR')
      .reduce((s, e) => s + e.amount, 0);
  }, [yearExpenses]);

  // Calcolo Effetto Pedana
  const palletDiscount = data.settings.palletDiscount || 0.22;
  const palletSavingConcime = round2(concimeTotal * palletDiscount);

  // Totali per categoria spese
  const categoryTotals = useMemo(() => {
    const cats: Record<ExpenseCategory, number> = {
      CONCIME: 0,
      IRRIGAZIONE: 0,
      CARBURANTE: 0,
      PASTI_BAR: 0,
      ATTREZZATURA: 0,
      ALTRO: 0,
    };
    for (const e of yearExpenses) {
      cats[e.category] = (cats[e.category] || 0) + e.amount;
    }
    return cats;
  }, [yearExpenses]);

  // Esecuzione parse spese
  const handleParseAndAdd = (textToParse: string) => {
    const parsed = parseQuickExpenses(textToParse);
    if (parsed.length === 0) {
      notify('Non ho trovato importi nella frase. Prova: "20 turbina 10 popup 5 bar"', 'warning');
      return;
    }
    const newItems = parsed.map((p) => ({
      date: today,
      category: p.category,
      description: p.description,
      amount: p.amount,
    }));
    addExpenses(newItems);
    setQuickInput('');
    const summary = newItems.map((e) => `${eur(e.amount)} ${e.description}`).join(', ');
    notify(`Aggiunte ${newItems.length} spese: ${summary}`);
  };

  // Simulatore vocale
  const handleVoiceSimulation = () => {
    setIsListening(true);
    const demoPhrases = [
      '20 euro turbina 10 euro pop up e 5 euro panino',
      '30 benzina furgone e 35 sacco concime',
      '15 raccordi 5 bar 20 turbina',
    ];
    const picked = demoPhrases[Math.floor(Math.random() * demoPhrases.length)];
    setTimeout(() => {
      setQuickInput(picked);
      setIsListening(false);
      notify(`Riconosciuto vocale: "${picked}"`, 'info');
    }, 1200);
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header Cassa ─────────────────────────────────── */}
      <section className="bg-emerald-950 px-4 pb-6 pt-1 text-white rounded-b-[2rem]">
        <div className="text-sm font-semibold text-emerald-300">Gestione Finanziaria</div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <h1 className="text-2xl font-black leading-tight">Cassa &amp; Spese</h1>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase text-emerald-300">Da incassare</div>
            <div className="text-2xl font-black tabular-nums text-amber-300">{eurShort(unpaidTotal)}</div>
          </div>
        </div>

        {/* Switch sotto-sezioni */}
        <div className="mt-4">
          <Segmented<CassaSection>
            value={cassaSection}
            onChange={setCassaSection}
            dark
            options={[
              {
                value: 'incassi',
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <HandCoins className="h-4 w-4" /> Chi Deve Pagare
                    {unpaidInterventions.length > 0 && (
                      <span className="rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white">
                        {unpaidInterventions.length}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                value: 'spese',
                label: (
                  <span className="flex items-center justify-center gap-1.5">
                    <Wallet className="h-4 w-4" /> Spese &amp; Pedana
                  </span>
                ),
              },
            ]}
          />
        </div>
      </section>

      <div className="px-4 pt-4">
        {/* ═══════════════════════════════════════════════════ */}
        {/* SEZIONE A: CHI DEVE PAGARE & INCASSI               */}
        {/* ═══════════════════════════════════════════════════ */}
        {cassaSection === 'incassi' && (
          <div className="space-y-4">
            {/* Banner Totale Sospesi */}
            <div className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 p-4 text-white shadow-lg shadow-red-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-red-100">Totale Crediti da Incassare</div>
                  <div className="text-3xl font-black tabular-nums mt-0.5">{eur(unpaidTotal)}</div>
                </div>
                <div className="rounded-2xl bg-white/20 p-3">
                  <HandCoins className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="mt-2 text-xs font-semibold text-red-100">
                {unpaidInterventions.length === 0
                  ? 'Nessun conto in sospeso. Tutti i clienti sono in pari!'
                  : `${unpaidInterventions.length} interventi da incassare. Usa i bottoni per sollecitare o incassare sul posto.`}
              </div>
            </div>

            {/* Lista Sospesi */}
            <div>
              <SectionTitle>
                <span className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5 text-red-600" /> Sospesi da Incassare ({unpaidInterventions.length})
                </span>
              </SectionTitle>

              {unpaidInterventions.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
                  title="Cassa pulita!"
                  text="Non hai clienti con debiti arretrati."
                />
              ) : (
                <div className="space-y-3">
                  {unpaidInterventions.map((i) => {
                    const client = data.clients.find((c) => c.id === i.clientId);
                    const phone = client?.phone || '';
                    return (
                      <Card key={i.id} className="border-l-4 border-l-red-500 ring-red-200 bg-red-50/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-black text-slate-900 leading-tight">{i.clientName}</div>
                            <div className="mt-0.5 text-xs font-semibold text-slate-500">
                              Intervento del <span className="text-slate-800 font-bold">{fmtDate(i.date)}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {interventionSummary(i)}
                            </div>
                            {i.notes && (
                              <div className="mt-1.5 text-xs text-slate-500 italic bg-white/80 p-2 rounded-xl ring-1 ring-slate-200">
                                &quot;{i.notes}&quot;
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-2xl font-black text-red-700 tabular-nums">{eur(i.totalAmount)}</div>
                            <Badge className="bg-red-100 text-red-800 mt-1">SOSPESO</Badge>
                          </div>
                        </div>

                        {/* Bottoni 1-Tap Incassa & WhatsApp */}
                        <div className="mt-3.5 grid grid-cols-2 gap-2 pt-2 border-t border-red-200/60">
                          <Button
                            size="md"
                            variant="primary"
                            className="bg-emerald-600 text-white font-bold text-sm"
                            onClick={() => setIncassoIntervention(i)}
                          >
                            <CheckCircle2 className="h-5 w-5" /> Incassa Ora
                          </Button>

                          {phone ? (
                            <LinkButton
                              size="md"
                              variant="whatsapp"
                              className="text-sm font-bold"
                              href={whatsappLink(phone, reminderMessage(i))}
                            >
                              <MessageCircle className="h-5 w-5" /> Sollecita WA
                            </LinkButton>
                          ) : (
                            <Button
                              size="md"
                              variant="outline"
                              className="text-xs"
                              onClick={() => notify('Nessun numero di telefono salvato per questo cliente', 'warning')}
                            >
                              Senza telefono
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Storico Pagati */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <SectionTitle className="!mt-0 !mb-0">
                  <span className="flex items-center gap-2 text-emerald-950">
                    <History className="h-5 w-5 text-emerald-600" /> Storico Incassati
                  </span>
                </SectionTitle>
                <span className="text-xs font-bold text-slate-500">
                  Quest&apos;anno: <b className="text-emerald-700">{eurShort(paidYearTotal)}</b>
                </span>
              </div>

              {paidInterventions.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-6">Nessun pagamento registrato.</div>
              ) : (
                <div className="space-y-2">
                  {paidInterventions.slice(0, 10).map((i) => {
                    const Icon = i.paymentMethod ? METHOD_ICONS[i.paymentMethod] : Banknote;
                    return (
                      <div
                        key={i.id}
                        className="flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-200 text-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 truncate">{i.clientName}</div>
                            <div className="text-xs text-slate-500">
                              {fmtDateShort(i.date)} · {i.paymentMethod ? i.paymentMethod : 'PAGATO'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-black text-emerald-700 text-base tabular-nums">{eur(i.totalAmount)}</span>
                          <button
                            onClick={() => {
                              markUnpaid(i.id);
                              notify(`Conto di ${i.clientName} spostato nei sospesi`, 'info');
                            }}
                            title="Rimetti nei sospesi"
                            className="p-1 text-slate-300 hover:text-red-500 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {paidInterventions.length > 10 && (
                    <div className="text-center text-xs text-slate-400 py-2">
                      e altri {paidInterventions.length - 10} interventi storici...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* SEZIONE B: SPESE & ALERT PEDANA                     */}
        {/* ═══════════════════════════════════════════════════ */}
        {cassaSection === 'spese' && (
          <div className="space-y-4">
            {/* ── 1. Spesa Lampo 1-Tap ─────────────────────── */}
            <Card className="ring-emerald-200/90 bg-emerald-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-black text-emerald-950 uppercase tracking-wide">
                  <Zap className="h-5 w-5 text-amber-500" /> Spesa Lampo (Anti-Dimenticanza)
                </div>
                <Badge className="bg-emerald-200 text-emerald-900 text-[10px]">1 TAP</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Tocca per segnare all&apos;istante la micro-spesa appena fatta al banco o al distributore:
              </p>

              {/* Bottoni 1-Tap */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUICK_EXPENSES.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => {
                      addExpenses([
                        {
                          date: today,
                          category: q.category,
                          description: q.description,
                          amount: q.amount,
                        },
                      ]);
                      notify(`Segnata spesa: ${q.emoji} ${q.label} (${eur(q.amount)})`);
                    }}
                    className="flex items-center gap-2 rounded-2xl bg-white p-2.5 text-left ring-1 ring-slate-200 shadow-sm transition active:scale-95 hover:border-emerald-500"
                  >
                    <span className="text-2xl shrink-0">{q.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{q.label}</div>
                      <div className="text-sm font-black text-emerald-700">{eur(q.amount, 0)}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Smart Quick-Add Bar (Dettatura / Testo) ── */}
              <div className="mt-3.5 pt-3 border-t border-emerald-200/60">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" /> Parser Dettatura Naturale
                  </span>
                  <button
                    onClick={handleVoiceSimulation}
                    className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Volume2 className="h-3 w-3" /> Prova frase demo
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={quickInput}
                      onChange={(e) => setQuickInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleParseAndAdd(quickInput);
                      }}
                      placeholder='Es. "20 turbina 10 pop up 5 bar"'
                      className={cn(inputCls, 'pr-10 text-sm font-medium')}
                    />
                    <button
                      type="button"
                      onClick={handleVoiceSimulation}
                      className={cn(
                        'absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition',
                        isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-emerald-700',
                      )}
                      title="Simula dettatura vocale"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="px-4 text-sm font-bold"
                    onClick={() => handleParseAndAdd(quickInput)}
                  >
                    Registra
                  </Button>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Riconosce più spese nella stessa frase ed estrae categoria e prezzo automaticamente.
                </div>
              </div>
            </Card>

            {/* ── 2. BOX INTELLIGENTE "EFFETTO PEDANA" ──────── */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-5 text-amber-950 shadow-xl shadow-amber-950/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl bg-white/30 p-2 text-amber-950">
                    <Package className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-amber-950/80">
                      Alert Economico &quot;Mizzica quanto spendi!&quot;
                    </div>
                    <div className="text-xl font-black text-white leading-tight">Consiglio Compra a Pedana</div>
                  </div>
                </div>
              </div>

              {/* Numeri in evidenza */}
              <div className="mt-4 rounded-2xl bg-amber-900/20 p-3.5 backdrop-blur-sm">
                <p className="text-sm font-medium leading-relaxed text-amber-50">
                  Quest&apos;anno hai speso <span className="font-black text-white text-base">{eur(concimeTotal)}</span> comprando
                  concime a sacchi singoli e <span className="font-black text-white text-base">{eur(microSpeseTotal)}</span> tra turbine,
                  pop-up e pranzi veloci non segnati.
                </p>
              </div>

              {/* Calcolo Opportunità */}
              <div className="mt-3.5 rounded-2xl bg-white p-4 shadow-sm text-slate-900">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-800 tracking-wider">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Opportunità Pedana Stagionale
                </div>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-700">
                  Comprando un bancale/pedana intera di concime ad inizio stagione invece che a sacco singolo{' '}
                  <span className="text-emerald-700 font-bold">(-22% costo medio all&apos;ingrosso)</span>, avresti risparmiato:
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-700 tabular-nums">{eur(palletSavingConcime)}</span>
                  <span className="text-xs font-bold text-slate-500">netti risparmiati all&apos;anno</span>
                </div>
              </div>
            </div>

            {/* ── 3. Analisi Spese per Categoria (CSS Puro) ── */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <SectionTitle className="!mt-0 !mb-0 text-base">Uscite 12 Mesi per Categoria</SectionTitle>
                <span className="text-sm font-black text-slate-900">{eur(yearExpensesTotal)}</span>
              </div>

              <div className="space-y-3">
                {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const amount = categoryTotals[cat] || 0;
                  const pct = yearExpensesTotal > 0 ? Math.round((amount / yearExpensesTotal) * 100) : 0;

                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <span>{meta.emoji}</span> {meta.label}
                        </span>
                        <span className="tabular-nums font-extrabold text-slate-900">
                          {eur(amount)} <span className="text-slate-400 font-normal">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', meta.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* ── 4. Registro Spese Recenti ────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <SectionTitle className="!mt-0 !mb-0">Ultime Spese Registrate</SectionTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setManualExpenseOpen(true)}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuova Spesa
                </Button>
              </div>

              <div className="space-y-2">
                {data.expenses.slice(0, 8).map((exp) => {
                  const meta = CATEGORY_META[exp.category];
                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-200 text-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{meta.emoji}</span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate">{exp.description}</div>
                          <div className="text-xs text-slate-500">
                            {fmtDateShort(exp.date)} · <span className="font-semibold">{meta.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-slate-900 tabular-nums">{eur(exp.amount)}</span>
                        <button
                          onClick={() => {
                            deleteExpense(exp.id);
                            notify('Spesa rimossa', 'info');
                          }}
                          className="p-1 text-slate-300 hover:text-red-500 transition"
                          title="Elimina spesa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sheet Incasso Rapido ──────────────────────────── */}
      {incassoIntervention && (
        <Sheet
          open={!!incassoIntervention}
          onClose={() => setIncassoIntervention(null)}
          tone="emerald"
          title={`Incassa ${eur(incassoIntervention.totalAmount)}`}
          subtitle={`${incassoIntervention.clientName} · ${fmtDate(incassoIntervention.date)}`}
          icon={<Receipt className="h-8 w-8 text-white" />}
        >
          <div className="space-y-3">
            <div className="text-sm font-bold text-slate-700">Come ha effettuato il pagamento?</div>
            <div className="grid gap-2">
              <Button
                size="lg"
                variant="outline"
                className="w-full justify-start text-base gap-3"
                onClick={() => {
                  markPaid(incassoIntervention.id, 'CASH');
                  notify(`Incassati ${eur(incassoIntervention.totalAmount)} in contanti!`);
                  setIncassoIntervention(null);
                }}
              >
                <Banknote className="h-6 w-6 text-emerald-600" /> Contanti sul posto
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full justify-start text-base gap-3"
                onClick={() => {
                  markPaid(incassoIntervention.id, 'TRANSFER');
                  notify(`Incassati ${eur(incassoIntervention.totalAmount)} tramite bonifico!`);
                  setIncassoIntervention(null);
                }}
              >
                <Landmark className="h-6 w-6 text-sky-600" /> Bonifico Bancario
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full justify-start text-base gap-3"
                onClick={() => {
                  markPaid(incassoIntervention.id, 'POS');
                  notify(`Incassati ${eur(incassoIntervention.totalAmount)} con POS/carta!`);
                  setIncassoIntervention(null);
                }}
              >
                <CreditCard className="h-6 w-6 text-purple-600" /> POS / Carta di Debito
              </Button>
            </div>
          </div>
        </Sheet>
      )}

      {/* ── Sheet Spesa Manuale ──────────────────────────── */}
      <ManualExpenseSheet
        open={manualExpenseOpen}
        onClose={() => setManualExpenseOpen(false)}
        onAdd={(e) => {
          addExpenses([e]);
          notify(`Spesa "${e.description}" registrata!`);
          setManualExpenseOpen(false);
        }}
        today={today}
      />
    </div>
  );
}

function ManualExpenseSheet({
  open,
  onClose,
  onAdd,
  today,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (e: Omit<Expense, 'id'>) => void;
  today: string;
}) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('IRRIGAZIONE');
  const [date, setDate] = useState(today);

  const handleSave = () => {
    const a = parseFloat(amount.replace(',', '.'));
    if (!desc.trim() || !a) return;
    onAdd({
      description: desc.trim(),
      amount: a,
      category,
      date,
    });
    setDesc('');
    setAmount('');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuova Spesa"
      subtitle="Inserimento dettagliato di un'uscita"
      icon={<Receipt className="h-7 w-7 text-emerald-600" />}
      footer={
        <Button size="lg" className="w-full" onClick={handleSave} disabled={!desc.trim() || !amount}>
          Salva Spesa
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Descrizione Spesa">
          <input
            className={inputCls}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Es. Raccordi a compressione 25mm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Importo (€)">
            <input
              className={inputCls}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Data">
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Categoria">
          <select
            className={cn(inputCls, 'appearance-none font-bold')}
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Sheet>
  );
}
