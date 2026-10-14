import type {
  Client,
  Expense,
  ExpenseCategory,
  Intervention,
  SporadicJob,
} from '@/types';

// ─────────────────────────────────────────────────────────────
// ID & valuta
// ─────────────────────────────────────────────────────────────

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** Formattazione valuta italiana: "€ 1.950,00" */
export function eur(value: number, decimals = 2): string {
  const n = Number.isFinite(value) ? value : 0;
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '- ' : ''}€ ${grouped}${dec ? ',' + dec : ''}`;
}

/** Valuta compatta senza decimali se intera: "€ 150" / "€ 152,50" */
export function eurShort(value: number): string {
  return Number.isInteger(value) ? eur(value, 0) : eur(value, 2);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function fmtHours(h: number): string {
  return `${h.toString().replace('.', ',')}h`;
}

// ─────────────────────────────────────────────────────────────
// Date (stringhe ISO locali YYYY-MM-DD, senza problemi di fuso)
// ─────────────────────────────────────────────────────────────

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addMonths(iso: string, months: number): string {
  const d = fromISO(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

/** Giorni da a → b (positivo se b è dopo a) */
export function diffDays(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** Differenza calendario in mesi + giorni */
export function monthsAndDays(from: string, to: string): { months: number; days: number } {
  let months = 0;
  while (addMonths(from, months + 1) <= to) months++;
  const days = diffDays(addMonths(from, months), to);
  return { months, days };
}

export function humanElapsed(from: string, to: string = todayISO()): string {
  const total = diffDays(from, to);
  if (total <= 0) return 'oggi';
  if (total === 1) return 'ieri';
  const { months, days } = monthsAndDays(from, to);
  if (months === 0) return `${total} giorni fa`;
  const m = months === 1 ? '1 mese' : `${months} mesi`;
  if (days === 0) return `${m} fa`;
  return `${m} e ${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
}

const WEEKDAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];
const MONTHS_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function fmtDate(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(iso: string): string {
  const d = fromISO(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear().toString().slice(-2)}`;
}

export function fmtDayLabel(iso: string, today = todayISO()): string {
  const diff = diffDays(today, iso);
  const d = fromISO(iso);
  const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (diff === 0) return `Oggi · ${base}`;
  if (diff === 1) return `Domani · ${base}`;
  if (diff === -1) return `Ieri · ${base}`;
  return base;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[fromISO(iso).getDay()];
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split('-').map(Number);
  return short ? MONTHS_SHORT[m - 1] : `${MONTHS[m - 1]} ${y}`;
}

export function isSunday(iso: string): boolean {
  return fromISO(iso).getDay() === 0;
}

/** Ultimi 12 mesi (chiavi YYYY-MM) dal più vecchio al corrente */
export function last12MonthKeys(today = todayISO()): string[] {
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) keys.push(monthKey(addMonths(today.slice(0, 8) + '01', -i)));
  return keys;
}

export function isWithinLastYear(iso: string, today = todayISO()): boolean {
  const d = diffDays(iso, today);
  return d >= 0 && d < 365;
}

// ─────────────────────────────────────────────────────────────
// Semaforo concimazione
// ─────────────────────────────────────────────────────────────

export type FertStatus = 'GREEN' | 'YELLOW' | 'RED' | 'NEVER';

export interface FertInfo {
  status: FertStatus;
  daysSince: number | null;
  daysLeft: number | null;
  progress: number; // 0..1+
  label: string;
  elapsed: string;
}

export function fertilizationInfo(client: Client, today = todayISO()): FertInfo {
  if (!client.lastFertilizationDate) {
    return {
      status: 'NEVER',
      daysSince: null,
      daysLeft: null,
      progress: 1,
      label: 'MAI REGISTRATA',
      elapsed: 'Nessuna concimazione registrata',
    };
  }
  const interval = client.fertilizationIntervalDays || 150;
  const daysSince = diffDays(client.lastFertilizationDate, today);
  const daysLeft = interval - daysSince;
  const warnWindow = Math.max(21, Math.round(interval * 0.2));
  let status: FertStatus = 'GREEN';
  if (daysSince > interval) status = 'RED';
  else if (daysLeft <= warnWindow) status = 'YELLOW';
  const label = status === 'RED' ? 'IN RITARDO' : status === 'YELLOW' ? 'IN SCADENZA' : 'OK';
  return {
    status,
    daysSince,
    daysLeft,
    progress: daysSince / interval,
    label,
    elapsed: humanElapsed(client.lastFertilizationDate, today),
  };
}

export function needsFertilization(client: Client, today = todayISO()): boolean {
  const s = fertilizationInfo(client, today).status;
  return s === 'RED' || s === 'YELLOW' || s === 'NEVER';
}

// ─────────────────────────────────────────────────────────────
// Conto intervento
// ─────────────────────────────────────────────────────────────

export interface BillInput {
  workersCount: number;
  hoursWorked: number;
  hourlyRatePerWorker: number;
  wasteDisposalCost: number;
  fertilizationApplied: boolean;
  fertilizationCost: number;
  extraItems: { priceToClient: number; costToMe: number }[];
}

export function computeBill(b: BillInput) {
  const labor = round2(b.workersCount * b.hoursWorked * b.hourlyRatePerWorker);
  const waste = round2(b.wasteDisposalCost || 0);
  const fert = b.fertilizationApplied ? round2(b.fertilizationCost || 0) : 0;
  const extras = round2(b.extraItems.reduce((s, x) => s + (x.priceToClient || 0), 0));
  const extrasCost = round2(b.extraItems.reduce((s, x) => s + (x.costToMe || 0), 0));
  const total = round2(labor + waste + fert + extras);
  return { labor, waste, fert, extras, extrasCost, total, materialMargin: round2(extras - extrasCost) };
}

export function interventionSummary(i: Intervention): string {
  const parts = [`${i.workersCount} op × ${fmtHours(i.hoursWorked)}`];
  if (i.wasteDisposalCost > 0) parts.push('smaltimento');
  if (i.fertilizationApplied) parts.push('concimazione');
  if (i.extraItems.length) {
    const names = i.extraItems.map((x) => x.name);
    parts.push(names.length > 2 ? `${names.length} materiali` : names.join(', '));
  }
  return parts.join(' + ');
}

// ─────────────────────────────────────────────────────────────
// Simulatore canone fisso
// ─────────────────────────────────────────────────────────────

export interface FeeSimulation {
  interventions: Intervention[];
  yearTotal: number;
  monthlyAverage: number;
  safeFee: number;
  comfortFee: number;
  count: number;
}

export function simulateFixedFee(
  client: Client,
  interventions: Intervention[],
  today = todayISO(),
): FeeSimulation {
  const list = interventions
    .filter((i) => i.clientId === client.id && isWithinLastYear(i.date, today))
    .sort((a, b) => a.date.localeCompare(b.date));
  const yearTotal = round2(list.reduce((s, i) => s + i.totalAmount, 0));
  const monthlyAverage = round2(yearTotal / 12);
  // Margine di sicurezza: +5% arrotondato ai 5€ superiori, oppure +10% "per stare larghi"
  const safeFee = Math.ceil((monthlyAverage * 1.05) / 5) * 5;
  const comfortFee = Math.max(safeFee + 5, Math.ceil((monthlyAverage * 1.1) / 5) * 5);
  return { interventions: list, yearTotal, monthlyAverage, safeFee, comfortFee, count: list.length };
}

export function isFixedFeeCandidate(client: Client, interventions: Intervention[]): boolean {
  if (client.fixedMonthlyRate) return false;
  return simulateFixedFee(client, interventions).count >= 4;
}

/** "proporle" / "proporgli" / "proporre" in base al titolo */
export function pronounFor(name: string): { verb: string; obj: string } {
  const n = name.toLowerCase();
  if (/^(sig\.ra|sig\.na|signora|dott\.ssa|avv\.ssa|ing\.ssa)/.test(n)) return { verb: 'proporle', obj: 'lei' };
  if (/^(sig\.|signor|dott\.|avv\.|ing\.|geom\.)/.test(n)) return { verb: 'proporgli', obj: 'lui' };
  return { verb: 'proporre', obj: '' };
}

// ─────────────────────────────────────────────────────────────
// Link esterni (WhatsApp, telefono, Maps, Google Calendar)
// ─────────────────────────────────────────────────────────────

export function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  else if (p.startsWith('00')) p = p.slice(2);
  else if (p.length >= 9 && p.length <= 10) p = '39' + p;
  return p;
}

export function whatsappLink(phone: string, text: string): string {
  const p = normalizePhone(phone);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export function mapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function gcalLink(opts: { title: string; date: string; details?: string; location?: string; hours?: number }) {
  const start = opts.date.replace(/-/g, '');
  const startT = `${start}T080000`;
  const endH = 8 + Math.ceil(opts.hours ?? 3);
  const endT = `${start}T${pad(Math.min(endH, 20))}0000`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${startT}/${endT}`,
    details: opts.details ?? 'Creato da VerdePro',
    location: opts.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function reminderMessage(i: Intervention): string {
  return (
    `Buongiorno ${i.clientName}, sono il suo giardiniere 🌿\n` +
    `Le ricordo gentilmente il saldo dell'intervento del ${fmtDate(i.date)} ` +
    `(${interventionSummary(i)}) per un importo di ${eur(i.totalAmount)}.\n` +
    `Può pagare in contanti alla prossima visita o con bonifico. Grazie mille e buona giornata!`
  );
}

export function feeProposalMessage(client: Client, sim: FeeSimulation, fee: number): string {
  return (
    `Buongiorno ${client.name}, sono il suo giardiniere 🌿\n` +
    `Negli ultimi 12 mesi abbiamo fatto ${sim.count} interventi nel suo giardino. ` +
    `Per semplificarle la vita le propongo un canone fisso di ${eur(fee, 0)} al mese, tutto compreso ` +
    `(manutenzione ricorrente, controllo impianto di irrigazione e concimazioni stagionali). ` +
    `Così non deve più pensare ai singoli conti. Mi faccia sapere se le interessa!`
  );
}

export function fertilizationMessage(client: Client): string {
  const when = client.lastFertilizationDate ? humanElapsed(client.lastFertilizationDate) : 'da molto tempo';
  return (
    `Buongiorno ${client.name}, sono il suo giardiniere 🌿\n` +
    `L'ultima concimazione del suo prato risale a ${when}. È il momento giusto per rifarla ` +
    `e mantenere il verde bello e sano. Se è d'accordo la eseguo alla prossima visita.`
  );
}

// ─────────────────────────────────────────────────────────────
// Agenda: occorrenze ricorrenti + carico giornata
// ─────────────────────────────────────────────────────────────

export interface AgendaVisit {
  kind: 'VISIT';
  key: string;
  date: string;
  client: Client;
  isNext: boolean;
  estHours: number;
}

export interface AgendaJob {
  kind: 'JOB';
  key: string;
  date: string;
  job: SporadicJob;
  estHours: number;
}

export type AgendaItem = AgendaVisit | AgendaJob;

/** Durata stimata di una visita (ore-cantiere) in base allo storico */
export function estimatedVisitHours(client: Client, interventions: Intervention[]): number {
  const list = interventions.filter((i) => i.clientId === client.id).slice(-6);
  if (!list.length) return 3;
  const avg = list.reduce((s, i) => s + i.hoursWorked, 0) / list.length;
  return Math.max(1, Math.round(avg * 2) / 2);
}

export function buildAgenda(
  clients: Client[],
  jobs: SporadicJob[],
  interventions: Intervention[],
  from: string,
  days: number,
): AgendaItem[] {
  const to = addDays(from, days - 1);
  const items: AgendaItem[] = [];
  for (const c of clients) {
    if (!c.nextVisitDate) continue;
    const est = estimatedVisitHours(c, interventions);
    let d = c.nextVisitDate;
    let first = true;
    let guard = 0;
    while (d <= to && guard < 60) {
      if (d >= from) items.push({ kind: 'VISIT', key: `${c.id}_${d}`, date: d, client: c, isNext: first, estHours: est });
      if (c.recurrenceWeeks <= 0) break;
      d = addDays(d, c.recurrenceWeeks * 7);
      first = false;
      guard++;
    }
  }
  for (const j of jobs) {
    if (j.status === 'SCHEDULED' && j.scheduledDate && j.scheduledDate >= from && j.scheduledDate <= to) {
      items.push({ kind: 'JOB', key: j.id, date: j.scheduledDate, job: j, estHours: j.estimatedHours });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'VISIT' ? -1 : 1));
}

export function dayLoad(date: string, items: AgendaItem[]): number {
  return items.filter((i) => i.date === date).reduce((s, i) => s + i.estHours, 0);
}

export function findFirstFreeSlot(
  hoursNeeded: number,
  clients: Client[],
  jobs: SporadicJob[],
  interventions: Intervention[],
  workdayHours: number,
  today = todayISO(),
): string {
  const horizon = 60;
  const start = addDays(today, 1);
  const agenda = buildAgenda(clients, jobs, interventions, start, horizon);
  for (let i = 0; i < horizon; i++) {
    const d = addDays(start, i);
    if (isSunday(d)) continue;
    if (dayLoad(d, agenda) + hoursNeeded <= workdayHours) return d;
  }
  return addDays(start, horizon);
}

// ─────────────────────────────────────────────────────────────
// Spese: categorie + parser "Spesa Lampo"
// ─────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; emoji: string; bar: string; chip: string }
> = {
  CONCIME: { label: 'Concime', emoji: '🌱', bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800' },
  IRRIGAZIONE: { label: 'Irrigazione', emoji: '💧', bar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800' },
  CARBURANTE: { label: 'Carburante', emoji: '⛽', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
  PASTI_BAR: { label: 'Pasti fuori', emoji: '🥪', bar: 'bg-rose-400', chip: 'bg-rose-100 text-rose-800' },
  ATTREZZATURA: { label: 'Attrezzatura', emoji: '🔧', bar: 'bg-slate-500', chip: 'bg-slate-200 text-slate-800' },
  ALTRO: { label: 'Altro', emoji: '📦', bar: 'bg-violet-400', chip: 'bg-violet-100 text-violet-800' },
};

const CATEGORY_KEYWORDS: [ExpenseCategory, RegExp][] = [
  ['CARBURANTE', /(benzin|gasolio|diesel|carburant|miscela|pieno|distributore|metano|gpl)/],
  ['CONCIME', /(concim|fertilizz|npk|humus|terriccio|torba|stallatico|sacc)/],
  ['IRRIGAZIONE', /(turbin|pop ?-?up|irrig|raccord|tubo|tubi|goccia|gocciolat|elettrovalvol|centralin|ugell|spruzz|irrigator|valvol|manichett)/],
  ['PASTI_BAR', /(bar|panin|pranz|caff|cena|mangia|pizza|colazion|cornett|acqua|bibit|tramezz|piadin|focacc|rosticc|arancin)/],
  ['ATTREZZATURA', /(filo|lama|lame|forbic|attrezz|motosega|catena|guant|rastrell|pala|cesoi|tosaerba|soffiator|decespugliator|sega|tagliaerb|olio motore|candela)/],
];

export function categorize(desc: string): ExpenseCategory {
  const d = desc.toLowerCase();
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(d)) return cat;
  return 'ALTRO';
}

const NUMBER_WORDS: Record<string, number> = {
  uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17,
  diciotto: 18, diciannove: 19, venti: 20, venticinque: 25, trenta: 30, trentacinque: 35,
  quaranta: 40, quarantacinque: 45, cinquanta: 50, sessanta: 60, settanta: 70, ottanta: 80,
  novanta: 90, cento: 100, duecento: 200,
};

function prettyDescription(raw: string): string {
  let d = raw
    .replace(/\b(euro|eur|di|per|il|lo|la|i|gli|le|un|uno|una|del|della|dei|ho|speso|preso|comprato|pagato|poi|più|piu|ed|e|al|alla|allo|a)\b/g, ' ')
    .replace(/[,;:+.!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  d = d.replace(/\bpop ?-? ?up\b/g, 'pop-up');
  if (!d) return '';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export interface ParsedExpense {
  amount: number;
  description: string;
  category: ExpenseCategory;
}

/**
 * Parser frase naturale → spese multiple.
 * Esempi: "20 turbina 10 pop up 5 bar", "20 euro turbina 10 euro pop up e 5 euro panino",
 * "turbina 20, popup 10, benzina 30 €", "venti euro benzina".
 */
export function parseQuickExpenses(input: string): ParsedExpense[] {
  let text = ` ${input.toLowerCase()} `
    .replace(/€/g, ' euro ')
    .replace(/(\d+),(\d{1,2})\b/g, '$1.$2')
    .replace(/(\d)(euro)/g, '$1 $2');
  text = text.replace(/\b([a-zà-ù]+)\b/g, (w) => (w in NUMBER_WORDS ? ` ${NUMBER_WORDS[w]} ` : w));
  text = text.replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const startsWithNumber = /^\d/.test(text);
  const results: ParsedExpense[] = [];

  if (startsWithNumber) {
    // Formato "numero descrizione numero descrizione…"
    const re = /(\d+(?:\.\d+)?)\s*([^\d]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const amount = parseFloat(m[1]);
      const description = prettyDescription(m[2]);
      if (amount > 0) results.push({ amount, description: description || 'Spesa varia', category: categorize(description) });
    }
  } else {
    // Formato "descrizione numero descrizione numero…"
    const re = /([^\d]+?)\s*(\d+(?:\.\d+)?)\s*(?:euro)?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const amount = parseFloat(m[2]);
      const description = prettyDescription(m[1]);
      if (amount > 0) results.push({ amount, description: description || 'Spesa varia', category: categorize(description) });
    }
  }
  return results;
}

export function expensesInLastYear(expenses: Expense[], today = todayISO()): Expense[] {
  return expenses.filter((e) => isWithinLastYear(e.date, today));
}
