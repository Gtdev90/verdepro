import type { AppData, Client, Expense, ExpenseCategory, ExtraItem, Intervention, Settings, SporadicJob } from '@/types';
import { addDays, addMonths, computeBill, todayISO } from '@/lib/utils';

export const DATA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  defaultHourlyRate: 25,
  defaultWorkers: 2,
  defaultFertilizationPrice: 45,
  workdayHours: 8,
  palletThresholdConcime: 1000,
  palletThresholdIrrigazione: 800,
  palletDiscount: 0.22,
};

/** Materiali rapidi del calcolatore (costo mio → prezzo al cliente) */
export const QUICK_EXTRAS: { key: string; label: string; name: string; costToMe: number; priceToClient: number }[] = [
  { key: 'turbina', label: '+ Turbina', name: 'Turbina irrigazione', costToMe: 20, priceToClient: 35 },
  { key: 'popup', label: '+ Pop-up', name: 'Irrigatore pop-up', costToMe: 10, priceToClient: 18 },
  { key: 'concime', label: '+ Sacchi Concime', name: 'Sacco concime NPK', costToMe: 35, priceToClient: 50 },
];

/** Spese lampo 1-tap */
export const QUICK_EXPENSES: { emoji: string; label: string; description: string; amount: number; category: ExpenseCategory }[] = [
  { emoji: '💧', label: 'Pop-up', description: 'Pop-up', amount: 10, category: 'IRRIGAZIONE' },
  { emoji: '🚿', label: 'Turbina', description: 'Turbina irrigazione', amount: 20, category: 'IRRIGAZIONE' },
  { emoji: '🥪', label: 'Bar / Pranzo fuori', description: 'Bar / Pranzo fuori', amount: 5, category: 'PASTI_BAR' },
  { emoji: '🌱', label: 'Sacco Concime', description: 'Sacco concime', amount: 35, category: 'CONCIME' },
  { emoji: '⛽', label: 'Benzina', description: 'Benzina furgone', amount: 30, category: 'CARBURANTE' },
];

let seq = 0;
const sid = (p: string) => `${p}_seed_${(++seq).toString().padStart(3, '0')}`;

function extra(name: string, costToMe: number, priceToClient: number): ExtraItem {
  return { id: sid('x'), name, costToMe, priceToClient };
}

function mkIntervention(
  client: Client,
  date: string,
  o: {
    workers: number;
    hours: number;
    rate: number;
    waste?: number;
    fert?: number;
    extras?: ExtraItem[];
    status?: 'PAID' | 'UNPAID';
    method?: 'CASH' | 'TRANSFER' | 'POS';
    notes?: string;
  },
): Intervention {
  const extraItems = o.extras ?? [];
  const bill = computeBill({
    workersCount: o.workers,
    hoursWorked: o.hours,
    hourlyRatePerWorker: o.rate,
    wasteDisposalCost: o.waste ?? 0,
    fertilizationApplied: !!o.fert,
    fertilizationCost: o.fert ?? 0,
    extraItems,
  });
  const status = o.status ?? 'PAID';
  return {
    id: sid('int'),
    clientId: client.id,
    clientName: client.name,
    date,
    workersCount: o.workers,
    hoursWorked: o.hours,
    hourlyRatePerWorker: o.rate,
    wasteDisposalCost: o.waste ?? 0,
    fertilizationApplied: !!o.fert,
    fertilizationCost: o.fert ?? 0,
    extraItems,
    totalAmount: bill.total,
    paymentStatus: status,
    paymentMethod: status === 'PAID' ? (o.method ?? 'CASH') : undefined,
    notes: o.notes,
  };
}

export function createSeedData(today: string = todayISO()): AppData {
  seq = 0;
  const ago = (d: number) => addDays(today, -d);

  // ── Clienti ────────────────────────────────────────────────
  const caruso: Client = {
    id: 'cli_caruso',
    name: 'Sig.ra Caruso',
    phone: '+39 347 112 2334',
    address: 'Via degli Ulivi 14, Catania',
    recurrenceWeeks: 2,
    nextVisitDate: today,
    // 5 mesi e mezzo fa → ROSSO
    lastFertilizationDate: addDays(addMonths(today, -5), -15),
    fertilizationIntervalDays: 150,
    technicalNotes: {
      controllerModel: 'Rain Bird ESP-RZX 6',
      zonesCount: 6,
      sprinklerTypes: '4 turbine (da 20€) + 8 pop-up statici',
      notes: '6 settori, 4 turbine a 20€ e 8 pop-up. Rubinetto generale dietro la siepe di alloro.',
    },
    fixedMonthlyRate: null,
  };

  const trovato: Client = {
    id: 'cli_trovato',
    name: 'Sig.ra Trovato',
    phone: '+39 339 455 6778',
    address: 'Viale delle Rose 3, Acireale',
    recurrenceWeeks: 2,
    nextVisitDate: today,
    // 4 mesi fa → GIALLO
    lastFertilizationDate: addMonths(today, -4),
    fertilizationIntervalDays: 150,
    technicalNotes: {
      controllerModel: 'Hunter X-Core 4',
      zonesCount: 4,
      sprinklerTypes: 'Ala gocciolante aiuole + 6 pop-up Hunter PS',
      notes: 'Cane in giardino (buono). Chiave cancelletto sotto il vaso.',
    },
    fixedMonthlyRate: null,
  };

  const rossi: Client = {
    id: 'cli_rossi',
    name: 'Villa Rossi',
    phone: '+39 333 987 6543',
    address: 'Contrada Monaci 22, Zafferana Etnea',
    recurrenceWeeks: 3,
    nextVisitDate: addDays(today, 3),
    // 1 mese fa → VERDE
    lastFertilizationDate: addMonths(today, -1),
    fertilizationIntervalDays: 150,
    technicalNotes: {
      controllerModel: 'Orbit B-hyve 8 zone (Wi-Fi)',
      zonesCount: 8,
      sprinklerTypes: '10 turbine Hunter PGP + gocciolatori agrumeto',
      notes: 'Prato grande + agrumeto. Servono 2 operai e il tosaerba trattorino.',
    },
    fixedMonthlyRate: null,
  };

  const querce: Client = {
    id: 'cli_querce',
    name: 'Condominio Le Querce',
    phone: '+39 095 765 4321',
    address: 'Via Etnea 401, Catania',
    recurrenceWeeks: 1,
    nextVisitDate: addDays(today, 1),
    lastFertilizationDate: addMonths(today, -2),
    fertilizationIntervalDays: 150,
    technicalNotes: {
      controllerModel: 'Hunter Pro-C 12',
      zonesCount: 12,
      sprinklerTypes: 'Turbine I-20 + pop-up aiuole ingresso',
      notes: 'Referente: amministratore Sig. Leotta. Canone fisso annuale già attivo.',
    },
    fixedMonthlyRate: 280,
  };

  const clients = [caruso, trovato, rossi, querce];

  // ── Interventi ─────────────────────────────────────────────
  // Sig.ra Caruso — 9 interventi, totale annuo €1.740 → €145/mese
  const carusoInts: Intervention[] = [
    mkIntervention(caruso, ago(340), { workers: 1, hours: 4.5, rate: 30, waste: 40, extras: [extra('Turbina irrigazione', 12, 20)] }),
    mkIntervention(caruso, ago(300), { workers: 2, hours: 3, rate: 30 }),
    mkIntervention(caruso, ago(260), { workers: 2, hours: 2.5, rate: 30, method: 'TRANSFER' }),
    mkIntervention(caruso, ago(220), { workers: 2, hours: 3, rate: 30, waste: 70, notes: 'Potatura siepe + ramaglie' }),
    mkIntervention(caruso, caruso.lastFertilizationDate!, { workers: 2, hours: 3, rate: 30, fert: 45 }),
    mkIntervention(caruso, ago(120), { workers: 2, hours: 1.5, rate: 30, extras: [extra('Irrigatore pop-up', 6, 10)] }),
    mkIntervention(caruso, ago(80), { workers: 2, hours: 3, rate: 30, method: 'POS' }),
    mkIntervention(caruso, ago(45), { workers: 2, hours: 4, rate: 30, waste: 40 }),
    mkIntervention(caruso, ago(14), { workers: 2, hours: 3, rate: 30 }),
  ];

  // Sig.ra Trovato — 8 interventi (50/100/150) + ultimo da 160€ NON PAGATO
  const trovatoInts: Intervention[] = [
    mkIntervention(trovato, ago(330), { workers: 2, hours: 2, rate: 25 }),
    mkIntervention(trovato, ago(280), { workers: 1, hours: 2, rate: 25 }),
    mkIntervention(trovato, ago(230), { workers: 2, hours: 3, rate: 25 }),
    mkIntervention(trovato, ago(180), { workers: 2, hours: 2, rate: 25, method: 'TRANSFER' }),
    mkIntervention(trovato, trovato.lastFertilizationDate!, { workers: 2, hours: 2, rate: 25, fert: 50 }),
    mkIntervention(trovato, ago(75), { workers: 1, hours: 2, rate: 25 }),
    mkIntervention(trovato, ago(35), { workers: 2, hours: 2, rate: 25 }),
    mkIntervention(trovato, ago(6), {
      workers: 2, hours: 3, rate: 25,
      extras: [extra('Irrigatore pop-up', 6, 10)],
      status: 'UNPAID',
      notes: 'Sostituito pop-up rotto vicino al vialetto',
    }),
  ];

  // Villa Rossi — storico + insoluto da 220€
  const rossiInts: Intervention[] = [
    mkIntervention(rossi, ago(150), { workers: 2, hours: 3, rate: 30, method: 'TRANSFER' }),
    mkIntervention(rossi, ago(105), { workers: 2, hours: 3.5, rate: 30, waste: 40, method: 'TRANSFER' }),
    mkIntervention(rossi, ago(63), { workers: 2, hours: 3, rate: 30, method: 'TRANSFER' }),
    mkIntervention(rossi, rossi.lastFertilizationDate!, { workers: 2, hours: 3, rate: 30, fert: 45, method: 'TRANSFER' }),
    mkIntervention(rossi, ago(9), {
      workers: 2, hours: 3, rate: 30, waste: 40,
      status: 'UNPAID',
      notes: 'Taglio prato + potatura agrumi, ramaglie portate in discarica',
    }),
  ];

  const interventions = [...carusoInts, ...trovatoInts, ...rossiInts].sort((a, b) => a.date.localeCompare(b.date));

  // ── Lavori sporadici (Riempi-buchi) ────────────────────────
  const sporadicJobs: SporadicJob[] = [
    {
      id: 'job_greco',
      clientName: 'Sig. Greco',
      phone: '+39 320 111 2223',
      title: 'Abbattimento albero secco',
      estimatedHours: 4,
      estimatedPrice: 350,
      priority: 'HIGH',
      status: 'PENDING',
    },
    {
      id: 'job_condverde',
      clientName: 'Condominio Verde',
      phone: '+39 095 333 4445',
      title: 'Pulizia grondaia e taglio rami tetto',
      estimatedHours: 2.5,
      estimatedPrice: 150,
      priority: 'MEDIUM',
      status: 'PENDING',
    },
    {
      id: 'job_bianchi',
      clientName: 'Dott. Bianchi',
      phone: '+39 348 666 7778',
      title: 'Sostituzione centralina e 2 turbine',
      estimatedHours: 1.5,
      estimatedPrice: 120,
      priority: 'LOW',
      status: 'PENDING',
    },
  ];

  // ── Spese ──────────────────────────────────────────────────
  const expenses: Expense[] = [];
  const exp = (daysAgo: number, category: ExpenseCategory, description: string, amount: number) =>
    expenses.push({ id: sid('exp'), date: ago(daysAgo), category, description, amount });

  // Micro-spese recenti
  exp(0, 'IRRIGAZIONE', 'Turbina irrigazione', 20);
  exp(0, 'IRRIGAZIONE', 'Pop-up', 10);
  exp(0, 'PASTI_BAR', 'Fermata a mangiare fuori / Bar', 5);
  exp(1, 'CARBURANTE', 'Benzina furgone e decespugliatore', 45);

  // Concime a sacchi singoli: totale 12 mesi = €1.950
  const concime = [175, 140, 210, 105, 175, 140, 210, 140, 175, 105, 210, 165];
  concime.forEach((amount, i) => exp(8 + i * 29, 'CONCIME', `Concime a sacchi singoli (${Math.round(amount / 35)} sacchi)`, amount));

  // Micro-spese irrigazione e bar storiche (insieme alle recenti = €480)
  [12, 40, 75, 130, 190, 260].forEach((d) => exp(d, 'IRRIGAZIONE', 'Turbina irrigazione', 20));
  [18, 33, 60, 98, 150, 205, 240, 300].forEach((d) => exp(d, 'IRRIGAZIONE', 'Pop-up', 10));
  [25, 140, 280].forEach((d) => exp(d, 'IRRIGAZIONE', 'Raccordi e manicotti', 15));
  [110, 230].forEach((d) => exp(d, 'IRRIGAZIONE', 'Elettrovalvola 24V', 35));
  [3, 9, 16, 22, 44, 66, 88, 121, 175, 222].forEach((d) => exp(d, 'PASTI_BAR', 'Panino / Bar', 5));
  [27, 85, 160, 250].forEach((d) => exp(d, 'PASTI_BAR', 'Pranzo fuori', 10));
  [50, 115, 199, 270, 330].forEach((d) => exp(d, 'PASTI_BAR', 'Pranzo veloce rosticceria', 8));

  // Carburante mensile
  [15, 30, 46, 61, 77, 92, 107, 123, 138, 153, 169, 184, 200, 215, 231, 246, 262, 277, 293, 308, 324, 339, 355].forEach((d, i) =>
    exp(d, 'CARBURANTE', i % 3 === 0 ? 'Miscela decespugliatore' : 'Benzina furgone', i % 3 === 0 ? 18 : 55),
  );

  // Attrezzatura
  exp(20, 'ATTREZZATURA', 'Filo decespugliatore 3mm', 25);
  exp(95, 'ATTREZZATURA', 'Lama tosaerba', 40);
  exp(210, 'ATTREZZATURA', 'Catena motosega', 32);
  exp(290, 'ATTREZZATURA', 'Guanti antitaglio', 18);

  expenses.sort((a, b) => b.date.localeCompare(a.date));

  return {
    version: DATA_VERSION,
    clients,
    interventions,
    sporadicJobs,
    expenses,
    settings: { ...DEFAULT_SETTINGS },
  };
}
