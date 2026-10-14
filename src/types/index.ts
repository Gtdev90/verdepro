// ─────────────────────────────────────────────────────────────
// VerdePro — Modelli dati
// ─────────────────────────────────────────────────────────────

export interface TechnicalNotes {
  controllerModel?: string;
  zonesCount?: number;
  sprinklerTypes?: string;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  /** Ogni quante settimane si interviene (0 = sporadico / a chiamata) */
  recurrenceWeeks: number;
  /** Data ISO (YYYY-MM-DD) della prossima visita */
  nextVisitDate: string;
  /** Data ISO dell'ultima concimazione */
  lastFertilizationDate: string | null;
  /** Intervallo consigliato fra due concimazioni (default 150 gg / 5 mesi) */
  fertilizationIntervalDays: number;
  /** Passaporto tecnico del giardino */
  technicalNotes: TechnicalNotes;
  /** Canone fisso mensile già attivo (null = lavora a chiamata) */
  fixedMonthlyRate: number | null;
}

export interface ExtraItem {
  id: string;
  name: string;
  costToMe: number;
  priceToClient: number;
}

export type PaymentStatus = 'PAID' | 'UNPAID';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'POS';

export interface Intervention {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  workersCount: number;
  hoursWorked: number;
  hourlyRatePerWorker: number;
  wasteDisposalCost: number;
  fertilizationApplied: boolean;
  fertilizationCost: number;
  extraItems: ExtraItem[];
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export type JobPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type JobStatus = 'PENDING' | 'SCHEDULED';

export interface SporadicJob {
  id: string;
  clientName: string;
  phone: string;
  title: string;
  estimatedHours: number;
  estimatedPrice: number;
  priority: JobPriority;
  status: JobStatus;
  scheduledDate?: string;
}

export type ExpenseCategory =
  | 'CONCIME'
  | 'IRRIGAZIONE'
  | 'CARBURANTE'
  | 'PASTI_BAR'
  | 'ATTREZZATURA'
  | 'ALTRO';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
}

export interface Settings {
  defaultHourlyRate: number;
  defaultWorkers: number;
  defaultFertilizationPrice: number;
  /** Ore di lavoro disponibili in una giornata (per calcolo buchi) */
  workdayHours: number;
  /** Soglia annua oltre la quale scatta l'alert "Compra a Pedana" */
  palletThresholdConcime: number;
  palletThresholdIrrigazione: number;
  /** Sconto medio acquistando a pedana/bancale (0.22 = -22%) */
  palletDiscount: number;
}

export type TabId = 'agenda' | 'calcola' | 'clienti' | 'cassa';
export type ClientFilter = 'ALL' | 'FERT' | 'FEE';
export type CassaSection = 'incassi' | 'spese';

export interface AppData {
  version: number;
  clients: Client[];
  interventions: Intervention[];
  sporadicJobs: SporadicJob[];
  expenses: Expense[];
  settings: Settings;
}

