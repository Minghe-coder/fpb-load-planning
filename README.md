# FPB Load Planning

Web app per la gestione dei costi di trasporto, palletizzazione e analisi margini per SKU.

**Stack:** Next.js 15 (App Router) · Prisma · SQLite · Tailwind CSS

## Setup

```bash
npm install
```

### Database

```bash
# Crea/aggiorna lo schema
npx prisma migrate dev

# (opzionale) Popola con dati di esempio
npx prisma db seed
```

### Avvio

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Struttura

| Sezione | Percorso | Funzione |
|---|---|---|
| Dashboard | `/` | KPI generali, margini medi |
| Prodotti | `/prodotti` | Anagrafica SKU, dati fisici cartone |
| Clienti | `/clienti` | Listini, margini per cliente |
| Spedizioni | `/spedizioni` | Import e distribuzioni, allocazione costi |
| Palletizer | `/palletizer` | Wizard + visualizzazione 3D pallet |
| Analisi | `/analisi` | Trend trasporti, impatto margini |
| Fornitori | `/fornitori` | Anagrafica fornitori |
| Impostazioni | `/impostazioni` | Tasso overhead per anno fiscale |

## Variabili d'ambiente

Nessuna variabile obbligatoria. Il database SQLite viene creato in `prisma/dev.db`.

Per ambienti di produzione, impostare `DATABASE_URL` nel file `.env`:

```
DATABASE_URL="file:./prod.db"
```
