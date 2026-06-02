# JobMatcher — Job Matching Tool

**Homo Digital**

---

## Cel projektu

Narzędzie CLI które na podstawie profilu kandydata w formacie MD automatycznie pobiera oferty z job boardów, ocenia dopasowanie i zwraca posortowaną listę najlepszych ofert z uzasadnieniem.

Projekt jako produkt płatny, np. $0.10 za każde wywołanie. Homo Digital używa go jako część swojego workflow agenta.

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
{
  "matched": [
    {
      "score": 94,
      "title": "Senior Node.js Engineer",
      "company": "PaymentX",
      "salary": "24-30k PLN B2B",
      "match_reasons": ["TypeScript", "Node.js", "fintech", "remote"],
      "red_flags": [],
      "url": "justjoin.it/offers/..."
    }
  ],
  "unmatched": [
    {
      "score": 0,
      "title": "Senior Dev",
      "company": "BodyLease",
      "rejection_reasons": ["outsourcing", "brak widełek"],
      "url": "justjoin.it/offers/..."
    }
  ],
  "stats": {
    "total_fetched": 120,
    "matched": 8,
    "unmatched": 112,
    "generated_at": "2026-06-02T20:00:00Z"
  }
}
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
│   └── index.ts                  # CLI entry point
├── package.json
├── tsconfig.json
└── README.md
```

---

## Tech stack

- **Node.js + TypeScript** — CLI tool
- **JustJoin.it API** — publiczne, darmowe, bez klucza API
- **Claude API** — scoring dopasowania i uzasadnienie (wymaga klucza)
- **commander.js** — CLI interface
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

## CLI interface

```bash
# Podstawowe użycie
jobmatcher --profile ./profil.md

# Z filtrem minimalnego score
jobmatcher --profile ./profil.md --min-score 70

# Output do pliku JSON
jobmatcher --profile ./profil.md --output json > oferty.json

# Bez AI scoringu (szybsze, bez kosztów API)
jobmatcher --profile ./profil.md --no-ai

# Limit wyników
jobmatcher --profile ./profil.md --limit 20
```

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

## Licencja

MIT — open source, każdy może używać i rozwijać.

---

_Homo Digital — homodigital.io_
