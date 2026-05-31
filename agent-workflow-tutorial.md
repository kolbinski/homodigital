# Agent Workflow — Plan działania dla pojedynczego klienta

**Homo Digital / Career Agent Platform**
**Dokument wewnętrzny — tylko dla agentów**

---

> Ten dokument opisuje kompletny workflow agenta od momentu onboardingu klienta do znalezienia pracy. Jest to żywy playbook — aktualizowany na podstawie doświadczeń z kolejnymi klientami.
>
> Dokumenty referencyjne dla klienta:
> - Profil kandydata: https://homodigital.io/view.html?file=profil-kandydata-tutorial.md
> - Optymalizacja LinkedIn: https://homodigital.io/view.html?file=linkedin-kandydata-tutorial.md

---

## Faza 0 — Przed onboardingiem

**Cel:** przygotowanie środowiska pracy zanim klient wypełni profil.

**Checklisty agenta:**

- [ ] Utwórz dedykowany folder klienta w Google Drive: `Klienci / [Imię Nazwisko] / `
- [ ] Utwórz strukturę podfolderów: `CV`, `Oferty`, `Korespondencja`, `Raporty`
- [ ] Przygotuj arkusz Google Sheets (live raport aplikacji) z kolumnami:
  - Data | Firma | Stanowisko | Link do oferty | Źródło | Status | Następny krok | Notatki
- [ ] Udostępnij arkusz klientowi z prawami widoku
- [ ] Wyślij klientowi link do tutorialu profilu i poproś o wypełnienie przed rozmową weryfikacyjną
- [ ] Wyślij klientowi link do tutorialu LinkedIn
- [ ] Umów rozmowę weryfikacyjną (30-45 min) na po wypełnieniu profilu

---

## Faza 1 — Onboarding (Tydzień 1)

### 1a. Analiza profilu kandydata

Po otrzymaniu wypełnionego profilu agent czyta go w całości i przygotowuje:

**Mapa mocnych stron:**
Które osiągnięcia są najsilniejsze? Które technologie są najbardziej rynkowe? Jakie branże pasują do historii kandydata?

**Mapa ryzyk:**
Jakie luki w profilu może wytknąć rekruter? Jakie pytania będą najtrudniejsze ("dlaczego odszedłeś z X")? Co jest słabe w obecnym LinkedIn/CV?

**Strategia narracji:**
Jak opowiedzieć historię kariery kandydata w 2 minutach? Jak wytłumaczyć każde odejście z pracy dyplomatycznie? Jakie jest jego "positioning statement" na rynku?

**Benchmark wynagrodzenia:**
Na podstawie profilu technologicznego, lat doświadczenia i rynku docelowego — czy oczekiwania kandydata są rynkowe, za niskie czy za wysokie?

---

### 1b. Rozmowa weryfikacyjna (30-45 min)

Cel rozmowy: nie zbierać danych (to zrobi profil) — tylko uzupełnić luki i poznać kandydata jako człowieka.

**Agenda rozmowy:**
1. Potwierdź najważniejsze osiągnięcia z profilu — czy liczby są dokładne?
2. Dopytaj o technologie gdzie kontekst jest niejasny
3. Omów przyczyny odejść — przygotuj dyplomatyczną wersję dla rekruterów
4. Ustal priorytety: czy ważniejsza jest szybkość znalezienia pracy czy idealne dopasowanie?
5. Omów styl komunikacji: jak często klient chce updates? WhatsApp / email / telefon?
6. Ustal zasady: klient potwierdza każdą aplikację zanim wyślesz

> **[TYLKO DLA AGENTA]** Zanotuj pierwsze wrażenie — jak klient mówi o sobie, czy jest pewny siebie, czy zaniża swoją wartość. To wpływa na strategię negocjacji wynagrodzenia.

---

### 1c. Optymalizacja LinkedIn

Na podstawie tutorialu LinkedIn (https://homodigital.io/view.html?file=linkedin-kandydata-tutorial.md) agent optymalizuje lub rekomenduje zmiany do profilu klienta:

- [ ] Headline — czy zawiera tytuł + kluczowe technologie?
- [ ] About — hook w pierwszym zdaniu, osiągnięcie z liczbą, CTA
- [ ] Każde doświadczenie — bullet achiever z liczbami
- [ ] Skills — top 3 to kluczowe technologie
- [ ] Featured — video pitch (jeśli istnieje), projekty własne
- [ ] URL — własny, bez cyfr
- [ ] Open to Work — ustalić z klientem czy włączyć

Jeśli klient nie ma video pitch — zaproponuj nagranie. Daj przykład struktury 90 sekund.

---

### 1d. Strategia rynkowa

Na podstawie profilu agent przygotowuje pisemną strategię (1 strona A4 do folderu klienta):

**Targeting:**
Lista 10-15 docelowych firm w Polsce i/lub za granicą. Kryteria: typ firmy (product/startup), branża (fintech/SaaS/developer tools), wielkość, model pracy (remote/hybrid).

**Certyfikaty i umiejętności do zdobycia:**
Na podstawie analizy ofert — które certyfikaty maksymalnie zwiększą wartość kandydata w ciągu 30-90 dni? Jedno konkretne działanie z szacowanym ROI.

**Meetupy i networking:**
Które meetupy są warte uczestnictwa? Czy kandydat ma temat na lightning talk?

**Timeline:**
Realistyczny plan — kiedy pierwsze aplikacje, kiedy pierwsze rozmowy, kiedy realna zmiana pracy?

---

## Faza 2 — Przygotowanie CV (Tydzień 2)

### 2a. Generowanie CV pod ofertę

Dla każdej nowej oferty pracy:

1. Pobierz treść oferty (URL → web fetch lub ręcznie)
2. Porównaj wymagania z profilem kandydata
3. Oceń dopasowanie: aplikujemy / nie aplikujemy / aplikujemy po uzupełnieniu skilla
4. Jeśli aplikujemy — wygeneruj CV przez Claude API:
   - Input: profil kandydata (DOCX) + treść oferty
   - Output: CV w DOCX dopasowane pod keywords i stack
5. Walidacja w JobScan — celuj w 85%+ match score
6. Sprawdź czy CV nie zawiera technologii których kandydat nie ma
7. Prześlij kandydatowi do akceptacji

**Zasada:** agent nigdy nie wysyła CV bez akceptacji kandydata.

---

### 2b. Cover letter (opcjonalny)

Dla ofert gdzie cover letter jest wymagany lub wyróżni kandydata:

**Struktura:**
- Akapit 1: dlaczego ta firma, nie jakakolwiek
- Akapit 2: jedno konkretne osiągnięcie pasujące do oferty
- Akapit 3: czego szukasz i dlaczego teraz
- Maksymalnie 250 słów

Cover letter w języku oferty (PL lub EN).

---

## Faza 3 — Aktywny outreach (Tydzień 3+)

### 3a. Aplikowanie na oferty

Agent monitoruje:
- JustJoin.it
- No Fluff Jobs
- LinkedIn Jobs
- Bezpośrednie strony docelowych firm

**Workflow aplikacji:**
1. Znajdź ofertę pasującą do profilu
2. Dodaj do arkusza Google Sheets (status: "znaleziona")
3. Wygeneruj CV pod ofertę (Faza 2a)
4. Prześlij kandydatowi do akceptacji → status: "do akceptacji"
5. Po akceptacji — aplikuj → status: "aplikowano"
6. Ustaw reminder na 7 dni na follow-up

**Dzienny rytm:**
Minimum 5-10 ofert przejrzanych tygodniowo. Aplikujemy gdy dopasowanie profilu do oferty wynosi 70%+ — jakość dopasowania ważniejsza niż liczba wysłanych aplikacji. Jedna świetna aplikacja jest warta więcej niż dziesięć słabych.

---

### 3b. Bezpośredni outreach do rekruterów

Dla docelowych firm z listy targetowej:

1. Znajdź rekrutera lub hiring managera na LinkedIn
2. Wyślij personalizowaną wiadomość (nie automat LinkedIn):

```
Cześć [imię],

Jestem [stanowisko] z [X] latami doświadczenia w [branża/stack].
Obserwuję [firma] od jakiegoś czasu — [konkretny powód dlaczego
ta firma, np. produkt/technologia/kultura].

Czy jest szansa na rozmowę gdyby pojawiła się pasująca rola?

[imię kandydata]
```

3. Dodaj do arkusza → status: "outreach wysłany"
4. Follow-up po 7 dniach jeśli brak odpowiedzi

---

### 3c. Certyfikaty i umiejętności

Agent pilnuje planu certyfikatów z Fazy 1d. Przypomina klientowi o postępach. Rekomenduje konkretne kursy (Udemy, A Cloud Guru, Linux Foundation) gdy kandydat zaczyna przygotowania.

---

## Faza 4 — Wsparcie w procesie rekrutacyjnym

### 4a. Przygotowanie do rozmowy kwalifikacyjnej

Gdy klient dostanie zaproszenie na rozmowę:

**Briefing (1-2 dni przed):**
- Informacje o firmie: produkt, kultura, ostatnie newsy, technologie
- Skład zespołu rekrutacyjnego (LinkedIn research)
- Typowe pytania dla tej roli i firmy
- 5 pytań technicznych których się spodziewać (na podstawie oferty i stacku firmy)
- Jak opowiedzieć o odejściu z poprzedniej firmy — dyplomatyczna wersja uzgodniona wcześniej
- Rekomendowana stawka na pytanie "jakie są Twoje oczekiwania finansowe"

**Po rozmowie (do 24h):**
- Zadzwoń lub napisz do klienta — jak poszło?
- Zanotuj feedback dla agenta: co pytali, co było trudne
- Zaktualizuj arkusz → status: "po rozmowie"

---

### 4b. Negocjacje wynagrodzenia

Gdy klient dostaje ofertę:

1. Nie zgadzaj się od razu — zawsze negocjuj
2. Agent przygotowuje:
   - Benchmark rynkowy dla tej roli i firmy (salary intelligence z platformy)
   - Skrypt negocjacji: pierwsze zdanie, argumenty, kontrpropozycja
   - Dolna granica akceptacji (ustalona z klientem wcześniej)
3. Klient negocjuje sam — agent jest dostępny na WhatsApp w czasie rzeczywistym
4. Po negocjacjach: zanotuj wynik (wyjściowa oferta, finalna kwota) do bazy salary intelligence

---

### 4c. Post-mortem odmowy

Gdy klient dostaje odmowę:

W ciągu 48 godzin agent przygotowuje krótką analizę:
- Prawdopodobna przyczyna (CV, dopasowanie, rozmowa techniczna, inne)
- Co poprawić w CV lub narracji
- Czy warto aplikować ponownie i kiedy
- Jeden konkretny następny krok

Wyślij klientowi przez WhatsApp — nie przez email. Odmowa boli, szybka odpowiedź agenta buduje zaufanie.

---

## Faza 5 — Raport miesięczny

Na koniec każdego miesiąca agent przygotowuje raport dla klienta.

**Zawartość raportu:**
```
Okres: [miesiąc] [rok]
Agent: [imię agenta]

WYNIKI MIESIĄCA
Oferty przejrzane: [liczba]
Aplikacji wysłanych: [liczba]
Odpowiedzi od rekruterów: [liczba]
Rozmowy kwalifikacyjne: [liczba]
Oferty pracy: [liczba]

DZIAŁANIA
- [lista kluczowych działań]

LINKEDIN
Wyświetlenia profilu: [liczba]
Pojawienia w wyszukiwaniach: [liczba]
Nowe połączenia z rekruterami: [liczba]

POSTĘP CERTYFIKATÓW
- [status]

CO DZIAŁA
[obserwacje agenta]

CO OPTYMALIZOWAĆ
[rekomendacje na kolejny miesiąc]

PLAN NA KOLEJNY MIESIĄC
[3-5 konkretnych działań]
```

**Wersja zanonimizowana:**
Za zgodą klienta — raport bez danych osobowych jako materiał marketingowy Homo Digital.

---

## Faza 6 — Zmiana pracy

### 6a. Finalizacja

Gdy klient przyjmuje ofertę:
- [ ] Potwierdź datę startu i finalną kwotę
- [ ] Oblicz i wystaw fakturę success fee (50% miesięcznego przyrostu wynagrodzenia netto)
- [ ] Dodaj wynik do bazy salary intelligence (anonimowo)

### 6b. Onboarding do nowej pracy (opcjonalnie)

Przez pierwsze 30 dni agent pozostaje dostępny:
- Jak negocjować benefity przy podpisaniu umowy
- Jak się zaprezentować w nowym zespole
- Kiedy i jak prosić o podwyżkę po okresie próbnym

### 6c. Rekomendacja

Poproś klienta o:
- Krótką rekomendację na LinkedIn
- Zgodę na anonimowy case study dla Homo Digital
- Polecenie usługi znajomym developerom

---

## Zasady pracy agenta

**Komunikacja:**
- Podstawowy kanał: WhatsApp (szybki, osobisty)
- Dokumenty i raporty: Google Drive
- Live status aplikacji: Google Sheets (klient widzi na bieżąco)
- Czas odpowiedzi: maksymalnie 24h na wiadomość klienta, 48h na pełne zadanie

**Transparentność:**
- Żadnej aplikacji bez akceptacji kandydata
- Klient widzi arkusz aplikacji w czasie rzeczywistym
- Jeśli oferta nie pasuje do profilu — agent mówi to wprost

**Granice:**
- Agent nie podejmuje decyzji za klienta
- Agent nie kontaktuje obecnego pracodawcy klienta
- Agent nie zmyśla technologii w CV których klient nie ma
- Agent nie gwarantuje znalezienia pracy w określonym czasie

**Jakość CV:**
- Każde CV przechodzi walidację w JobScan (cel: 85%+ match)
- Żadna technologia w CV nie może być zmyślona
- Każde osiągnięcie musi mieć pokrycie w profilu kandydata

---

## Narzędzia agenta

| Narzędzie | Zastosowanie |
|---|---|
| Google Drive | Dokumenty klienta, CV, korespondencja |
| Google Sheets | Live raport aplikacji |
| WhatsApp | Codzienna komunikacja z klientem |
| JobScan | Walidacja CV pod oferty |
| NeuraCV | Analiza formatowania CV |
| LinkedIn | Outreach do rekruterów |
| JustJoin.it / NoFluffJobs | Monitoring ofert |
| Claude API | Generowanie CV pod oferty |
| Canva | Baner LinkedIn, materiały graficzne |

---

*Homo Digital — Agent Operating Manual v1.0*
*Dokument wewnętrzny. Nie udostępniać klientom.*
*homodigital.io*
