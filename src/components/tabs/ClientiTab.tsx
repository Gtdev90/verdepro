'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit,
  History,
  MapPin,
  MessageCircle,
  Phone,
  Sprout,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { useStore } from '@/store/AppStore';
import type { Client, ClientFilter } from '@/types';
import {
  eur,
  eurShort,
  feeProposalMessage,
  fertilizationInfo,
  fertilizationMessage,
  fmtDate,
  fmtHours,
  isFixedFeeCandidate,
  mapsLink,
  needsFertilization,
  pronounFor,
  simulateFixedFee,
  whatsappLink,
} from '@/lib/utils';
import { Badge, Button, Card, EmptyState, Field, LinkButton, Segmented, Sheet, cn, inputCls } from '../ui';


export function ClientiTab() {
  const { data, today, clientFilter, setClientFilter, markFertilized, notify, openCalculator } = useStore();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);

  // Filtro
  const fertDueCount = useMemo(
    () => data.clients.filter((c) => needsFertilization(c, today)).length,
    [data.clients, today],
  );

  const feeCandidatesCount = useMemo(
    () => data.clients.filter((c) => isFixedFeeCandidate(c, data.interventions)).length,
    [data.clients, data.interventions],
  );

  const filteredClients = useMemo(() => {
    return data.clients.filter((c) => {
      // Ricerca testo
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.technicalNotes.notes && c.technicalNotes.notes.toLowerCase().includes(q));
        if (!match) return false;
      }

      if (clientFilter === 'FERT') {
        return needsFertilization(c, today);
      }
      if (clientFilter === 'FEE') {
        return isFixedFeeCandidate(c, data.interventions);
      }
      return true;
    });
  }, [data.clients, data.interventions, clientFilter, search, today]);

  return (
    <div className="animate-fade-in">
      {/* ── Header Sezione ───────────────────────────────── */}
      <section className="bg-emerald-950 px-4 pb-6 pt-1 text-white rounded-b-[2rem]">
        <div className="text-sm font-semibold text-emerald-300">Anagrafica &amp; Agronomia</div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <h1 className="text-2xl font-black leading-tight">Clienti &amp; Concimi</h1>
          <Button
            size="sm"
            variant="amber"
            onClick={() => setIsNewClientOpen(true)}
            className="shadow-sm"
          >
            <UserPlus className="h-4 w-4" /> Nuovo
          </Button>
        </div>

        {/* Cerca */}
        <div className="mt-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca cliente, via o impianto..."
            className={cn(inputCls, 'min-h-11 bg-white/10 text-white placeholder:text-white/60 ring-white/20 focus:ring-emerald-400')}
          />
        </div>

        {/* Filtri rapidi con contatori */}
        <div className="mt-3">
          <Segmented<ClientFilter>
            value={clientFilter}
            onChange={setClientFilter}
            dark
            options={[
              { value: 'ALL', label: `Tutti (${data.clients.length})` },
              {
                value: 'FERT',
                label: (
                  <span className="flex items-center justify-center gap-1">
                    🌱 Da Concimare <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[11px] text-white">{fertDueCount}</span>
                  </span>
                ),
              },
              {
                value: 'FEE',
                label: (
                  <span className="flex items-center justify-center gap-1">
                    💡 Proponi Fisso <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[11px] text-amber-950">{feeCandidatesCount}</span>
                  </span>
                ),
              },
            ]}
          />
        </div>
      </section>

      <div className="space-y-4 px-4 pt-4">
        {filteredClients.length === 0 ? (
          <EmptyState
            icon={<Sprout className="h-8 w-8 text-emerald-600" />}
            title="Nessun cliente trovato"
            text={search ? 'Prova con un altro termine di ricerca' : 'Nessun cliente corrisponde al filtro selezionato.'}
          />
        ) : (
          filteredClients.map((client) => (
            <ClientDetailCard
              key={client.id}
              client={client}
              today={today}
              onSelect={() => setSelectedClient(client)}
              onEdit={() => setEditClient(client)}
              onMarkFertilized={() => {
                markFertilized(client.id, today);
                notify(`🌱 Concimazione di ${client.name} registrata oggi!`);
              }}
              onOpenCalc={() => openCalculator({ clientId: client.id })}
            />
          ))
        )}
      </div>

      {/* Sheet Dettaglio Storico Cliente */}
      {selectedClient && (
        <ClientHistorySheet
          client={selectedClient}
          open={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={() => {
            setEditClient(selectedClient);
            setSelectedClient(null);
          }}
        />
      )}

      {/* Sheet Modifica / Creazione Cliente */}
      {(editClient || isNewClientOpen) && (
        <ClientEditSheet
          client={editClient}
          open={!!editClient || isNewClientOpen}
          onClose={() => {
            setEditClient(null);
            setIsNewClientOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card Cliente Dettagliata
// ─────────────────────────────────────────────────────────────

function ClientDetailCard({
  client,
  today,
  onSelect,
  onEdit,
  onMarkFertilized,
  onOpenCalc,
}: {
  client: Client;
  today: string;
  onSelect: () => void;
  onEdit: () => void;
  onMarkFertilized: () => void;
  onOpenCalc: () => void;
}) {
  const { data } = useStore();
  const fert = fertilizationInfo(client, today);
  const sim = simulateFixedFee(client, data.interventions, today);
  const pronoun = pronounFor(client.name);

  // Calcolo stato semaforo
  const statusColor =
    fert.status === 'RED'
      ? 'border-red-400 bg-red-50 text-red-900 ring-red-200'
      : fert.status === 'YELLOW'
      ? 'border-amber-400 bg-amber-50 text-amber-900 ring-amber-200'
      : 'border-emerald-400 bg-emerald-50 text-emerald-900 ring-emerald-200';

  const progressColor =
    fert.status === 'RED'
      ? 'bg-red-500'
      : fert.status === 'YELLOW'
      ? 'bg-amber-400'
      : 'bg-emerald-500';

  return (
    <Card className="animate-fade-in border border-slate-200/80 hover:shadow-md transition">
      {/* Intestazione Cliente */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-slate-900 truncate">{client.name}</h3>
            {client.fixedMonthlyRate ? (
              <Badge className="bg-emerald-100 text-emerald-800">
                Fisso {eurShort(client.fixedMonthlyRate)}/m
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-700">
                {client.recurrenceWeeks > 0 ? `Ogni ${client.recurrenceWeeks} sett.` : 'A chiamata'}
              </Badge>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {client.phone && (
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Phone className="h-3 w-3 text-slate-400" /> {client.phone}
              </span>
            )}
            {client.address && (
              <a
                href={mapsLink(client.address)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:underline text-slate-500 truncate max-w-[200px]"
              >
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" /> {client.address}
              </a>
            )}
          </div>
        </div>

        <button
          onClick={onEdit}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition"
          aria-label="Modifica cliente"
        >
          <Edit className="h-4 w-4" />
        </button>
      </div>

      {/* ── 1. Semaforo Concimazione ──────────────────────── */}
      <div className={cn('mt-3.5 rounded-2xl p-3.5 ring-1 transition', statusColor)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {fert.status === 'RED' ? '🔴' : fert.status === 'YELLOW' ? '🟡' : '🟢'}
            </span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider">
                {fert.status === 'RED'
                  ? 'SCADUTA DA OLTRE 5 MESI'
                  : fert.status === 'YELLOW'
                  ? 'CONCIMAZIONE IN SCADENZA'
                  : 'CONCIMAZIONE REGOLARE'}
              </div>
              <div className="text-sm font-extrabold">
                {client.lastFertilizationDate
                  ? `Ultima: ${fert.elapsed} (${fmtDate(client.lastFertilizationDate)})`
                  : 'Nessuna concimazione registrata'}
              </div>
            </div>
          </div>
          <Badge className={cn('shrink-0 text-xs font-black uppercase', fert.status === 'RED' ? 'bg-red-200 text-red-950' : fert.status === 'YELLOW' ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200 text-emerald-950')}>
            {fert.label}
          </Badge>
        </div>

        {/* Barra di avanzamento temporale */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-bold opacity-80 mb-1">
            <span>Intervallo consigliato: {client.fertilizationIntervalDays} gg</span>
            {fert.daysSince !== null && (
              <span>
                {fert.daysSince} gg trascorsi {fert.daysLeft !== null && fert.daysLeft > 0 ? `(${fert.daysLeft} gg rimasti)` : `(in ritardo di ${Math.abs(fert.daysLeft || 0)} gg)`}
              </span>
            )}
          </div>
          <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', progressColor)}
              style={{ width: `${Math.min(100, Math.round(fert.progress * 100))}%` }}
            />
          </div>
        </div>

        {/* Bottoni rapidi per concimazione */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 bg-white text-slate-800 text-xs py-2 shadow-sm"
            onClick={onMarkFertilized}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Segna Concimato Oggi
          </Button>
          {(fert.status === 'RED' || fert.status === 'YELLOW') && client.phone && (
            <LinkButton
              size="sm"
              variant="whatsapp"
              className="text-xs shrink-0 py-2"
              href={whatsappLink(client.phone, fertilizationMessage(client))}
            >
              <MessageCircle className="h-4 w-4" /> Ricorda al cliente
            </LinkButton>
          )}
        </div>
      </div>

      {/* ── 2. Passaporto Tecnico Giardino ─────────────────── */}
      {(client.technicalNotes.controllerModel ||
        client.technicalNotes.zonesCount ||
        client.technicalNotes.sprinklerTypes ||
        client.technicalNotes.notes) && (
        <div className="mt-3 rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-200/80">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase text-sky-900 tracking-wider">
            <Wrench className="h-3.5 w-3.5 text-sky-700" /> Passaporto Tecnico Giardino
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
            {client.technicalNotes.controllerModel && (
              <div>
                <span className="text-slate-400 font-normal">Centralina: </span>
                <span className="font-bold text-sky-950">{client.technicalNotes.controllerModel}</span>
              </div>
            )}
            {client.technicalNotes.zonesCount && (
              <div>
                <span className="text-slate-400 font-normal">Settori: </span>
                <span className="font-bold text-sky-950">{client.technicalNotes.zonesCount} zone</span>
              </div>
            )}
          </div>
          {client.technicalNotes.sprinklerTypes && (
            <div className="mt-1 text-xs text-sky-950 font-bold">
              <span className="text-slate-400 font-normal">Ricambi montati: </span>
              {client.technicalNotes.sprinklerTypes}
            </div>
          )}
          {client.technicalNotes.notes && (
            <div className="mt-1.5 text-[11px] text-slate-600 italic bg-white/70 p-2 rounded-xl ring-1 ring-sky-100">
              &quot;{client.technicalNotes.notes}&quot;
            </div>
          )}
        </div>
      )}

      {/* ── 3. Simulatore "Conviene il Fisso Mensile?" ─────────── */}
      {!client.fixedMonthlyRate && sim.count >= 2 && (
        <div className="mt-3.5 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-950 p-4 text-white shadow-sm ring-1 ring-emerald-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-300 tracking-wider">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Simulatore Canone Fisso
            </div>
            <Badge className="bg-emerald-800 text-emerald-200 text-[10px]">
              {sim.count} interventi / 12 mesi
            </Badge>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 bg-white/10 rounded-xl p-2.5">
            <div>
              <div className="text-[11px] text-emerald-200">Totale 12 mesi</div>
              <div className="text-lg font-black tabular-nums text-white">{eur(sim.yearTotal)}</div>
            </div>
            <div>
              <div className="text-[11px] text-emerald-200">Media reale/mese</div>
              <div className="text-lg font-black tabular-nums text-amber-300">{eur(sim.monthlyAverage)}</div>
            </div>
          </div>

          <p className="mt-2.5 text-xs text-emerald-100 leading-relaxed">
            Non ti piace fare preventivi al buio, ma con <b>{client.name}</b> incassi già in media{' '}
            <span className="font-bold text-amber-300">{eurShort(sim.monthlyAverage)}/mese</span>. Puoi {pronoun.verb} un canone
            fisso sicuro di <span className="font-bold text-white underline underline-offset-2">{eurShort(sim.safeFee)}/mese</span>{' '}
            (o <b>{eurShort(sim.comfortFee)}/mese</b>) avendo la certezza matematica di non andarci sotto!
          </p>

          <div className="mt-3 flex items-center gap-2">
            {client.phone && (
              <LinkButton
                size="sm"
                variant="whatsapp"
                className="w-full text-xs font-bold py-2.5"
                href={whatsappLink(client.phone, feeProposalMessage(client, sim, sim.safeFee))}
              >
                <MessageCircle className="h-4 w-4" /> Invia Proposta Canone ({eurShort(sim.safeFee)})
              </LinkButton>
            )}
          </div>
        </div>
      )}

      {/* Azioni rapide di card */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <Button size="sm" variant="outline" className="text-xs" onClick={onSelect}>
          <History className="h-3.5 w-3.5" /> Storico ({sim.count})
        </Button>
        <Button size="sm" variant="dark" className="text-xs" onClick={onOpenCalc}>
          Fai il Conto
        </Button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Sheet Storico Completo Interventi Cliente
// ─────────────────────────────────────────────────────────────

function ClientHistorySheet({
  client,
  open,
  onClose,
  onEdit,
}: {
  client: Client;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data, today } = useStore();
  const sim = simulateFixedFee(client, data.interventions, today);
  const clientInterventions = useMemo(() => {
    return data.interventions
      .filter((i) => i.clientId === client.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.interventions, client.id]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tone="default"
      title={client.name}
      subtitle={`Storico interventi e passaporto giardino`}
      icon={<History className="h-7 w-7 text-emerald-600" />}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4" /> Modifica dati
          </Button>
          <Button variant="dark" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Box Sintesi Totali */}
        <div className="rounded-2xl bg-emerald-950 p-4 text-white">
          <div className="text-xs uppercase tracking-wider text-emerald-300 font-bold">Riepilogo ultimi 12 mesi</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/10 p-2">
              <div className="text-xs text-emerald-200">Interventi</div>
              <div className="text-xl font-black">{sim.count}</div>
            </div>
            <div className="rounded-xl bg-white/10 p-2">
              <div className="text-xs text-emerald-200">Fatturato</div>
              <div className="text-xl font-black">{eurShort(sim.yearTotal)}</div>
            </div>
            <div className="rounded-xl bg-white/10 p-2">
              <div className="text-xs text-emerald-200">Media/mese</div>
              <div className="text-xl font-black text-amber-300">{eurShort(sim.monthlyAverage)}</div>
            </div>
          </div>
        </div>

        {/* Lista Cronologica Interventi */}
        <div>
          <div className="text-sm font-extrabold text-slate-800 mb-2">Interventi registrati ({clientInterventions.length})</div>
          {clientInterventions.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500">Nessun intervento ancora registrato per questo cliente.</div>
          ) : (
            <div className="space-y-2.5">
              {clientInterventions.map((i) => (
                <div
                  key={i.id}
                  className={cn(
                    'rounded-2xl p-3 text-sm ring-1 ring-slate-200 bg-white transition',
                    i.paymentStatus === 'UNPAID' ? 'border-l-4 border-l-red-500 ring-red-200' : 'border-l-4 border-l-emerald-500',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{fmtDate(i.date)}</span>
                    <span className="font-black text-slate-900 tabular-nums">{eur(i.totalAmount)}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-x-2">
                    <span>
                      {i.workersCount} op × {fmtHours(i.hoursWorked)} ({eur(i.hourlyRatePerWorker, 0)}/h)
                    </span>
                    {i.wasteDisposalCost > 0 && <span>· Smaltimento {eur(i.wasteDisposalCost)}</span>}
                    {i.fertilizationApplied && <span className="text-emerald-700 font-bold">· 🌱 Concimato</span>}
                  </div>
                  {i.extraItems.length > 0 && (
                    <div className="mt-1 text-xs text-sky-700 font-semibold">
                      Materiali: {i.extraItems.map((x) => x.name).join(', ')}
                    </div>
                  )}
                  {i.notes && <div className="mt-1 text-xs text-slate-600 italic">&quot;{i.notes}&quot;</div>}
                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                    <Badge className={i.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                      {i.paymentStatus === 'PAID' ? `Pagato (${i.paymentMethod || 'CASH'})` : 'Da pagare (Sospeso)'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Sheet Modifica o Aggiunta Cliente
// ─────────────────────────────────────────────────────────────

function ClientEditSheet({
  client,
  open,
  onClose,
}: {
  client: Client | null;
  open: boolean;
  onClose: () => void;
}) {
  const { addClient, updateClient, deleteClient, notify, today } = useStore();
  const isEditing = !!client;

  const [name, setName] = useState(client?.name ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [address, setAddress] = useState(client?.address ?? '');
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(client?.recurrenceWeeks ?? 2);
  const [nextVisitDate, setNextVisitDate] = useState(client?.nextVisitDate ?? today);
  const [lastFertDate, setLastFertDate] = useState(client?.lastFertilizationDate ?? '');
  const [fertilizationInterval, setFertilizationInterval] = useState(client?.fertilizationIntervalDays ?? 150);
  const [fixedRate, setFixedRate] = useState(client?.fixedMonthlyRate ? String(client.fixedMonthlyRate) : '');

  // Note tecniche
  const [controllerModel, setControllerModel] = useState(client?.technicalNotes.controllerModel ?? '');
  const [zonesCount, setZonesCount] = useState(client?.technicalNotes.zonesCount ? String(client.technicalNotes.zonesCount) : '');
  const [sprinklerTypes, setSprinklerTypes] = useState(client?.technicalNotes.sprinklerTypes ?? '');
  const [techNotes, setTechNotes] = useState(client?.technicalNotes.notes ?? '');

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      notify('Inserisci almeno il nome del cliente', 'warning');
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      recurrenceWeeks: Number(recurrenceWeeks) || 0,
      nextVisitDate,
      lastFertilizationDate: lastFertDate || null,
      fertilizationIntervalDays: Number(fertilizationInterval) || 150,
      fixedMonthlyRate: fixedRate ? parseFloat(fixedRate.replace(',', '.')) : null,
      technicalNotes: {
        controllerModel: controllerModel.trim() || undefined,
        zonesCount: zonesCount ? parseInt(zonesCount, 10) : undefined,
        sprinklerTypes: sprinklerTypes.trim() || undefined,
        notes: techNotes.trim() || undefined,
      },
    };

    if (isEditing) {
      updateClient(client.id, payload);
      notify(`Cliente "${payload.name}" aggiornato!`);
    } else {
      addClient(payload);
      notify(`Nuovo cliente "${payload.name}" creato!`);
    }

    onClose();
  };

  const handleDelete = () => {
    if (!client) return;
    deleteClient(client.id);
    notify(`Cliente rimosso`, 'info');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? `Modifica ${client.name}` : 'Nuovo Cliente'}
      subtitle={isEditing ? 'Aggiorna recapiti e passaporto giardino' : 'Inserisci i dati per l’agenda e lo scadenziario'}
      icon={<UserCheck className="h-7 w-7 text-emerald-600" />}
      footer={
        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={handleSave}>
            Salva Cliente
          </Button>
          {isEditing && (
            <div>
              {!confirmDelete ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-red-600"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" /> Elimina cliente
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    Annulla
                  </Button>
                  <Button size="sm" variant="danger" className="flex-1" onClick={handleDelete}>
                    Conferma eliminazione
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nome Cliente / Condominio *">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Sig.ra Caruso"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefono">
            <input
              className={inputCls}
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+39 347..."
            />
          </Field>
          <Field label="Canone fisso (€/m, se c'è)">
            <input
              className={inputCls}
              inputMode="decimal"
              value={fixedRate}
              onChange={(e) => setFixedRate(e.target.value)}
              placeholder="Es. 150"
            />
          </Field>
        </div>

        <Field label="Indirizzo Giardino">
          <input
            className={inputCls}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Es. Via degli Ulivi 14, Catania"
          />
        </Field>

        {/* Ricorrenza e data prossima visita */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frequenza visite (sett.)">
            <select
              className={cn(inputCls, 'appearance-none font-bold')}
              value={recurrenceWeeks}
              onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
            >
              <option value={1}>Ogni 1 settimana</option>
              <option value={2}>Ogni 2 settimane (standard)</option>
              <option value={3}>Ogni 3 settimane</option>
              <option value={4}>Ogni 4 settimane (mensile)</option>
              <option value={0}>A chiamata / Sporadico</option>
            </select>
          </Field>
          <Field label="Prossima visita">
            <input
              type="date"
              className={inputCls}
              value={nextVisitDate}
              onChange={(e) => setNextVisitDate(e.target.value)}
            />
          </Field>
        </div>

        {/* Scadenziario Concimazione */}
        <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <div className="text-xs font-black uppercase text-emerald-900 tracking-wider mb-2">
            🌱 Scadenziario Concimazione
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data Ultima Concimazione">
              <input
                type="date"
                className={inputCls}
                value={lastFertDate}
                onChange={(e) => setLastFertDate(e.target.value)}
              />
            </Field>
            <Field label="Intervallo (giorni)">
              <input
                type="number"
                className={inputCls}
                value={fertilizationInterval}
                onChange={(e) => setFertilizationInterval(Number(e.target.value))}
                placeholder="150"
              />
            </Field>
          </div>
        </div>

        {/* Passaporto Tecnico */}
        <div className="rounded-2xl bg-sky-50 p-3 ring-1 ring-sky-200">
          <div className="text-xs font-black uppercase text-sky-900 tracking-wider mb-2">
            🔧 Passaporto Tecnico Impianto
          </div>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Field label="Modello Centralina">
              <input
                className={inputCls}
                value={controllerModel}
                onChange={(e) => setControllerModel(e.target.value)}
                placeholder="Es. Rain Bird ESP"
              />
            </Field>
            <Field label="N. Settori">
              <input
                type="number"
                className={inputCls}
                value={zonesCount}
                onChange={(e) => setZonesCount(e.target.value)}
                placeholder="Es. 6"
              />
            </Field>
          </div>
          <Field label="Ricambi & Ugelli montati">
            <input
              className={inputCls}
              value={sprinklerTypes}
              onChange={(e) => setSprinklerTypes(e.target.value)}
              placeholder="Es. 4 turbine Hunter + 8 pop-up statici"
            />
          </Field>
          <Field label="Note aggiuntive / accesso">
            <textarea
              className={cn(inputCls, 'min-h-16 py-2 mt-1')}
              value={techNotes}
              onChange={(e) => setTechNotes(e.target.value)}
              placeholder="Es. Rubinetto generale dietro la siepe, cane buono..."
            />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
