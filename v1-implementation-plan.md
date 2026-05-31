# Homo Digital — Plan implementacji V1

**Dokument dla cofoundera | Wersja do dyskusji**

---

## Cel V1

Zastąpić ręczne narzędzia (WhatsApp + Google Sheets + Drive) jednym prostym systemem który pozwoli agentowi obsługiwać 3-10 klientów bez chaosu operacyjnego.

**V1 NIE jest platformą.** V1 jest wewnętrznym narzędziem agenta.

---

## Stack technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---|---|---|
| Frontend + API | Next.js 14 + TypeScript | Jeden codebase, SSR, naturalny dla React devs |
| Baza danych | PostgreSQL (Supabase) | Darmowy tier, auth out-of-the-box, realtime |
| Auth | Google OAuth (Supabase) | Klienci mają Google, zero friction |
| Płatności | Stripe | Standard, webhooks, subskrypcje |
| AI / CV generator | Claude API (claude-sonnet) | ~1-2 grosze/CV |
| Storage dokumentów | Google Drive API | Klienci już tam są |
| Deploy | Vercel | Free tier, CI/CD z GitHub |
| Komunikacja | WhatsApp (na razie ręcznie) | V2 — Twilio / WhatsApp Business API |

**Koszt infrastruktury V1:** ~0-50 zł/miesiąc (wszystkie free tiery wystarczają na start)

---

## Zakres V1 — 4 moduły

### Moduł 1 — Profil klienta
- Formularz profilu kandydata (dane podstawowe, historia zatrudnienia, technologie, preferencje)
- Sekcje `[TYLKO DLA AGENTA]` — widoczne wyłącznie dla agenta, ukryte dla klienta
- Upload DOCX profilu lub wypełnienie online
- Historia zmian profilu (wersjonowanie)

### Moduł 2 — Tracker aplikacji
- Tabela: data / firma / stanowisko / źródło / status / następny krok / notatki
- Statusy: znaleziona / do akceptacji / wysłano / odpowiedź / rozmowa / odmowa / oferta
- Widok agenta (pełny) + widok klienta (read-only, live)
- Eksport do Google Sheets (dla klientów którzy wolą Sheets)
- Reminder system — alert gdy mija deadline follow-upu

### Moduł 3 — Generator CV
- Input: profil klienta (z bazy) + URL oferty pracy (web fetch)
- Wywołanie Claude API z systemowym promptem dopasowującym CV do oferty
- Output: DOCX do pobrania i PDF
- Historia wygenerowanych CV per klient per oferta
- Walidacja: agent oznacza każde CV przed wysłaniem

### Moduł 4 — Raport miesięczny
- Auto-agregacja danych z trackera (liczba ofert, aplikacji, rozmów)
- Szablon raportu wypełniany przez agenta (sekcje opisowe)
- Export do DOCX (gotowy do wysłania klientowi)
- Archiwum raportów per klient

---

## Czego NIE ma w V1

- ❌ Konto klienta / panel klienta (klient dostaje link do Google Sheets + raport PDF)
- ❌ Automatyczne aplikowanie
- ❌ Wtyczka Chrome
- ❌ Aplikacja mobilna
- ❌ Agregator ofert (agent szuka ręcznie)
- ❌ Shadow learning / AI automatyzacja
- ❌ Marketplace agentów
- ❌ Płatności online (na start: przelew + faktura)

---

## Schemat bazy danych (uproszczony)

```
clients
  id, name, email, phone, linkedin, github
  created_at, agent_id, status (active/inactive)

client_profiles
  id, client_id, data (JSONB), agent_notes (JSONB)
  version, updated_at

applications
  id, client_id, company, position, source
  status, applied_at, next_action, next_action_date, notes

cv_generations
  id, client_id, application_id, job_url, job_content
  prompt_used, output_docx_url, approved_by_agent, created_at

monthly_reports
  id, client_id, period_month, period_year
  stats (JSONB), agent_notes, docx_url, sent_at
```

---

## Timeline (vibe-coding, part-time)

| Tydzień | Zakres | Output |
|---|---|---|
| 1 | Setup: Next.js + Supabase + auth + deploy | Działające środowisko, login przez Google |
| 2 | Moduł 1: profil klienta | CRUD profilu, sekcje agenta/klienta |
| 3 | Moduł 2: tracker aplikacji | Tabela, statusy, widok klienta read-only |
| 4 | Moduł 3: generator CV | Claude API integration, upload/download DOCX |
| 5 | Moduł 4: raport miesięczny | Szablon + eksport DOCX |
| 6 | Polish + testy + deploy produkcyjny | V1 gotowe do użycia z pierwszymi klientami |

**Łącznie: 5-6 tygodni** przy ~3-4h dziennie vibe-codingu.
Przy intensywniejszej pracy (full-time sprint): 3 tygodnie.

---

## Podział pracy (propozycja)

| Obszar | Cofounder (backend/infra) | Krzysiek (produkt/agent) |
|---|---|---|
| Architektura DB i API | ✓ | konsultacje |
| Claude API integration | ✓ | prompt engineering |
| UI/UX (Next.js frontend) | ✓ | feedback i decyzje |
| Testy z pierwszymi klientami | obserwuje | ✓ |
| Feedback → poprawki | ✓ | zbiera od klientów |
| Prompt systemowy CV | konsultacje | ✓ |

---

## Pytania do dyskusji z cofounderem

1. Supabase czy własny PostgreSQL na Railway/Render?
2. Next.js App Router czy Pages Router — preferencja?
3. Stripe od V1 czy na razie przelew ręczny?
4. Google Drive API integracja — czy cofounder ma doświadczenie z OAuth service accounts?
5. Monorepo czy osobny frontend/backend?
6. Jaki jest realny czas który cofounder może poświęcić tygodniowo?

---

## Co zaczyna się PO V1

Dopiero gdy V1 jest w produkcji i obsługuje pierwszych klientów:

- Wtyczka Chrome (browser automation)
- Panel klienta z własnym loginem
- Agregator ofert (JustJoin API, scraping)
- WhatsApp Business API (automatyczne powiadomienia)
- Aplikacja mobilna (React Native + Expo)

---

*Homo Digital — V1 Implementation Plan*
*Wersja: 1.0 | Dokument roboczy do dyskusji*
