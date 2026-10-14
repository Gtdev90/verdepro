# 🌿 VerdePro — PWA per Giardinieri Professionisti

**VerdePro** è un'applicazione web progressiva (PWA) progettata specificamente per i professionisti della manutenzione del verde e del giardinaggio sul campo.

Risolve i 6 problemi reali e quotidiani della gestione sul campo ("UX da furgone"):

1. 📅 **Gestione Calendario Ricorrente + "Riempi-Buchi"**: Gestione interventi ogni 2/3/4 settimane. Se un cliente rinvia l'appuntamento, il sistema calcola le ore liberate e propone all'istante i lavori sporadici compatibili in lista d'attesa.
2. ⚡ **Calcolatore Live di Fine Lavoro + "Modalità Vista Cliente"**: Calcolo rapido `(Operai × Ore × Tariffa) + Smaltimento + Concimazione + Ricambi extra`. Toggle "Mostra al Cliente" che trasforma l'app in ricevuta pulita a schermo intero con tasti giganti **PAGATO ORA** o **DA PAGARE**.
3. 💶 **Controllo Sospesi & Incasso Rapido**: Monitoraggio dei crediti con solleciti precompilati su WhatsApp in un tap e incasso immediato sul posto (Contanti, Bonifico, POS).
4. 🌱 **Tracciamento Automatico Concimazioni (Scadenziario Agronomico)**: Semaforo visivo (Verde / Giallo / Rosso) basato sul tempo trascorso dall'ultima concimazione per non perdere mai il giro delle stagioni.
5. ⛽ **Spese Lampo & Analisi "Compra a Pedana"**: Bottoni 1-tap per micro-uscite (pop-up, turbina, bar, carburante) e parser per frasi naturali (*"20 turbina 10 pop up 5 bar"*). Include l'Alert Risparmio Ingrosso che calcola il risparmio effettivo acquistando bancali/pedane intere di concime.
6. 💡 **Simulatore Canone Fisso Mensile**: Analizza lo storico a chiamata degli ultimi 12 mesi, calcola la media reale e suggerisce un canone fisso con margine di sicurezza per fidelizzare i clienti senza rischiare di andare in perdita.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Stili**: [Tailwind CSS v4](https://tailwindcss.com/) — Palette Emerald & Amber, design mobile-first ad alto contrasto visibile sotto la luce del sole
- **Icone**: [lucide-react](https://lucide.dev/)
- **Persistenza**: React Context + `localStorage` con seed data realistici e pulsante "Ripristina Dati Demo"

---

## 🚀 Avvio Rapido

```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia il server di sviluppo
npm run dev

# 3. Compilazione di produzione
npm run build
```

L'app sarà disponibile all'indirizzo [http://localhost:3000](http://localhost:3000).

---

## 📱 PWA (Progressive Web App)

VerdePro include il Web App Manifest (`/manifest.webmanifest`) e può essere installata come applicazione nativa sia su Android che su iOS (aggiungendola alla schermata Home).
