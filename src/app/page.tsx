'use client';

import { AppShell } from '@/components/AppShell';
import { AgendaTab } from '@/components/tabs/AgendaTab';
import { CalcolaTab } from '@/components/tabs/CalcolaTab';
import { CassaTab } from '@/components/tabs/CassaTab';
import { ClientiTab } from '@/components/tabs/ClientiTab';
import { AppStoreProvider, useStore } from '@/store/AppStore';
import { Leaf, Loader2 } from 'lucide-react';

function VerdeProMain() {
  const { hydrated, tab } = useStore();

  if (!hydrated) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-emerald-950 text-white p-6">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-emerald-500 text-emerald-950 shadow-2xl mb-4 animate-pop">
          <Leaf className="h-10 w-10" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-black tracking-tight">
          Verde<span className="text-emerald-400">Pro</span>
        </h1>
        <p className="text-sm font-semibold text-emerald-300 mt-1">Caricamento furgone digitale...</p>
        <Loader2 className="h-6 w-6 mt-6 animate-spin text-emerald-400 opacity-80" />
      </div>
    );
  }

  return (
    <AppShell>
      {tab === 'agenda' && <AgendaTab />}
      {tab === 'calcola' && <CalcolaTab />}
      {tab === 'clienti' && <ClientiTab />}
      {tab === 'cassa' && <CassaTab />}
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <AppStoreProvider>
      <VerdeProMain />
    </AppStoreProvider>
  );
}
