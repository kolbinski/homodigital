# JobMatcher — Open Source Job Matching Tool

**Homo Digital / Open Source Project**

---

## Cel projektu

REST API które na podstawie profilu kandydata w formacie MD automatycznie pobiera oferty z job boardów, ocenia dopasowanie i zwraca posortowaną listę najlepszych ofert z uzasadnieniem.

Projekt open source — każdy developer może go użyć samodzielnie. Homo Digital używa go jako część swojego workflow agenta.

---

## Model biznesowy — Open Core

**Open source (MIT):**
Core matching engine dostępny publicznie na GitHub. Każdy developer może pobrać, uruchomić lokalnie i contribuować. Zawiera: parsowanie profilu MD, JustJoin.it API, podstawowy scoring technologiczny bez AI.

**Produkt płatny — JobMatcher API ($0.10/wywołanie):**
Hosted version z pełnymi możliwościami. Bez konfiguracji, bez własnego serwera, bez klucza Claude API.

Co dostaje płatny użytkownik ponad open source:

- AI scoring z uzasadnieniami i missing_skills (Claude API)
- Wszystkie źródła ofert — NoFluffJobs, RemoteOK, globalne job boardy
- Wyższe limity i SLA
- Filtrowanie per kraj i waluta
- Historia wywołań i analytics

Cena: **$0.10 za pojedyncze wywołanie API** — pay-per-use, bez subskrypcji.

Homo Digital używa płatnej wersji jako część workflow agenta.

---

## Input

Plik MD z profilem kandydata (format zgodny z Homo Digital candidate profile):

- Technologie z latami doświadczenia
- Preferencje (typ firmy, model pracy, branże)
- Czerwone flagi (outsourcing, legacy PHP, brak code review itp.)
- Widełki wynagrodzenia
- Lokalizacja / preferowany rynek

```bash
jobmatcher --profile ./marek-wisniewski-profil.md
```

---

## Output

Lista zmatchowanych ofert posortowana po score dopasowania:

```
✓ 94% — PaymentX / Senior Node.js Engineer
         Warszawa / Remote | 24-30k PLN B2B
         Match: TypeScript ✓, Node.js ✓, fintech ✓, remote ✓
         Red flags: brak ✓
         Link: justjoin.it/offers/paymentx-senior-node-js

✓ 87% — CloudBase / Fullstack Engineer
         Remote | 20-28k PLN B2B
         Match: React ✓, TypeScript ✓, SaaS ✓
         Red flags: brak ✓
         Link: justjoin.it/offers/cloudbase-fullstack

✗ 23% — BodyLease / Senior Dev
         Warszawa | 18-22k PLN B2B
         Red flags: outsourcing ✗, brak widełek ✗
         → Odrzucono automatycznie
```

---

## Architektura

```
jobmatcher/
├── src/
│   ├── parsers/
│   │   ├── profileParser.ts      # Parsowanie profilu MD kandydata
│   │   └── offerParser.ts        # Normalizacja ofert z różnych źródeł
│   ├── sources/
│   │   ├── justjoin.ts           # JustJoin.it API (publiczne, darmowe)
│   │   └── nofluffjobs.ts        # NoFluffJobs scraping (V2)
│   ├── scoring/
│   │   ├── techMatcher.ts        # Dopasowanie technologii
│   │   ├── redFlagFilter.ts      # Filtrowanie czerwonych flag
│   │   ├── salaryMatcher.ts      # Porównanie widełek
│   │   └── aiScorer.ts           # Claude API — scoring i uzasadnienie
│   ├── output/
│   │   └── formatter.ts          # Formatowanie wyników (CLI / JSON / MD)
│   └── index.ts                  # REST API entry point (Express)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Tech stack

- **Node.js + TypeScript** — CLI tool
- **JustJoin.it API** — publiczne, darmowe, bez klucza API (V1)
- **NoFluffJobs** — scraping (V2)
- **RemoteOK API** — publiczne, darmowe, globalny remote market (V3)
- **We Work Remotely** — scraping, USA/globalny (V3)
- **Wellfound (AngelList)** — startupy USA, scraping (V4)
- **Claude API** — scoring dopasowania i uzasadnienie (wymaga klucza)
- **Express.js** — REST API framework
- **zod** — walidacja schematów profilu i ofert

---

## Algorytm scoringu

### Krok 1 — Parsowanie profilu

Wyciągnięcie z MD:

- Lista technologii z wagami (lata doświadczenia)
- Czerwone flagi (lista must-not-have)
- Preferencje (typ firmy, model pracy, branże)
- Widełki wynagrodzenia min/max

### Krok 2 — Pobranie ofert

JustJoin API → normalizacja do wspólnego formatu:

```typescript
interface Offer {
  id: string;
  title: string;
  company: string;
  salary: { min: number; max: number; currency: string };
  technologies: string[];
  remote: boolean;
  city: string;
  companyType: string; // product | outsourcing | startup
  url: string;
}
```

### Krok 3 — Filtrowanie czerwonych flag

Hard filter przed scoringiem — oferty z czerwonymi flagami odrzucane automatycznie (score 0).

Przykłady red flag detection:

- "outsourcing" / "body leasing" → odrzuć
- brak widełek gdy kandydat wymaga widełek → odrzuć
- "PHP" jako primary stack → odrzuć (jeśli w czerwonych flagach)

### Krok 4 — Scoring

Dla każdej oferty która przeszła filtr:

```
score = (
  techScore * 0.40 +      // dopasowanie technologii
  salaryScore * 0.25 +    // dopasowanie widełek
  remoteScore * 0.20 +    // model pracy
  industryScore * 0.15    // branża
)
```

### Krok 5 — AI uzasadnienie (opcjonalne)

Claude API analizuje top 10 ofert i generuje krótkie uzasadnienie dla każdej:

- dlaczego pasuje
- potencjalne ryzyka
- rekomendacja: aplikuj / rozważ / pomiń

---

## REST API interface

```
POST /match
Content-Type: application/json

{
  "profile": "<treść pliku MD profilu kandydata>",
  "options": {
    "min_score": 70,
    "limit": 20,
    "ai_scoring": true,
    "sources": ["justjoin", "nofluffjobs"],
    "country": "PL"
  }
}
```

**Przykładowe endpointy:**

- `POST /match` — główne matchowanie
- `GET /sources` — lista dostępnych job boardów
- `GET /health` — status API

---

## Konfiguracja

```env
CLAUDE_API_KEY=sk-ant-...     # Wymagany tylko dla AI scoringu
JUSTJOIN_API_URL=https://justjoin.it/api/offers
```

---

## Roadmapa

**V1 — CLI + JustJoin:**

- Parsowanie profilu MD
- JustJoin API
- Tech matching + red flag filtering
- Output CLI

**V2 — AI scoring + NoFluffJobs:**

- Claude API dla uzasadnień
- NoFluffJobs scraping
- Output JSON / MD

**V3 — Web UI:**

- Prosty interfejs webowy
- Upload profilu MD
- Przeglądarka wyników z filtrowaniem

---

MIT — open source, każdy może używać i rozwijać.

---

_Homo Digital — homodigital.io_
