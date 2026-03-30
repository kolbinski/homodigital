# lex.gov.pl — Architektura systemu

## Narodowa infrastruktura transparentności legislacyjnej

### Zasada przewodnia

lex.gov.pl to infrastruktura państwowa — jak drogi, jak rejestry, jak mObywatel.
Własność Skarbu Państwa. Operowana przez NASK.
Kod platformy open source — każdy może zweryfikować jak działa.

Git jako silnik. lex.gov.pl jako twarz którą widzi obywatel.

---

## Nazwa i tożsamość

**Nazwa publiczna:** `lex.gov.pl`
Łacińskie "prawo" — ponadczasowe, profesjonalne, zrozumiałe bez znajomości technologii.
Obywatel nie musi wiedzieć że pod spodem jest git. Tak jak użytkownik mObywatela nie musi wiedzieć że pod spodem jest REST API.

**Silnik techniczny:** git
Otwarty standard. Sprawdzony przez 20 lat w największych projektach świata.
Każda instytucja na świecie która zna git — rozumie lex.gov.pl bez szkolenia.

**Infrastruktura:** NASK
Suwerenny hosting na polskich serwerach. Polska jurysdykcja.
Dane legislacyjne nie opuszczają kraju.

---

## Typy repozytoriów

### Repozytorium instytucjonalne

Należy do konkretnej instytucji. Jest jej przestrzenią roboczą.

Kto ma: Sejm RP, Senat RP, Rada Ministrów, każde ministerstwo,
każdy urząd centralny, każda rada gminy/powiatu/sejmiku,
każda szkoła publiczna, każdy podmiot publiczny finansowany ze Skarbu Państwa.

Tworzone przez: formalną rejestrację instytucji w systemie.
Administrator instytucji odpowiada za zawartość.

Przykład: `lex.gov.pl/sejm`, `lex.gov.pl/mc` (Ministerstwo Cyfryzacji),
`lex.gov.pl/warszawa`, `lex.gov.pl/sp7-sieradz`

---

### Repozytorium dokumentu

Każdy dokument legislacyjny to osobne repozytorium
wewnątrz repozytorium instytucji.

Typy dokumentów:

- Projekty ustaw i ich kolejne wersje
- Uchwały rad (gminy, powiatu, sejmiku, Sejmu, Senatu)
- Rozporządzenia i ich nowelizacje
- Budżety — roczne i wieloletnie wraz ze wszystkimi aneksami
- Miejscowe Plany Zagospodarowania Przestrzennego
- Statuty i regulaminy instytucji
- Podstawy programowe i plany nauczania (szkoły)

Tworzone przez: administratora instytucji przy inicjowaniu nowego dokumentu.

Przykład: `lex.gov.pl/sejm/ustawy/ai-act-implementacja-2026`,
`lex.gov.pl/warszawa/mpzp/mokotow-2025`,
`lex.gov.pl/sp7-sieradz/curriculum/matematyka-kl4`

---

### Repozytorium tematyczne

Widok crossowy — agreguje zapisy z wielu repozytoriów instytucjonalnych
według tematu, aktu prawnego wyższego rzędu lub obszaru regulacyjnego.

Przykłady:

- "Wszystkie przepisy implementujące AI Act" — agreguje zapisy z ustaw,
  rozporządzeń i wytycznych we wszystkich instytucjach
- "Wszystkie regulacje dotyczące ochrony danych osobowych"
- "Wszystkie uchwały samorządów dotyczące OZE w 2025 roku"

Tworzone przez: administratorów systemu (NASK/MC) lub
uprawnione instytucje nadzorcze (np. UODO, UOKiK, NIK).

---

## Model uprawnień

### Poziom 1 — Odczyt publiczny

**Kto:** każdy, bez logowania

**Co może:**

- Przeglądać pełną historię zmian wszystkich dokumentów
- Czytać stenogramy, opinie, konsultacje, statusy
- Wyszukiwać po treści, autorze, dacie, instytucji
- Śledzić kolizje między dokumentami
- Pobierać dane przez publiczne API

**Zasada:** transparentność jako default.
Domyślny stan całego systemu to pełna jawność.
Wyjątki (dokumenty niejawne) są oznaczone explicite i wymagają
odrębnej podstawy prawnej.

---

### Poziom 2 — Uczestnik konsultacji

**Kto:** obywatel zalogowany przez Profil Zaufany

**Co może:**

- Składać uwagi do konsultacji publicznych jako issues
- Śledzić status swoich uwag (uwzględniono / odrzucono / w toku)
- Subskrybować powiadomienia o zmianach w wybranych dokumentach
- Zadawać pytania do instytucji w kontekście konkretnego artykułu

**Uwagi:** tożsamość zweryfikowana przez Profil Zaufany.
Obywatel sam decyduje czy jego imię jest widoczne przy uwadze
(pseudonimizacja dozwolona dla ochrony prywatności).

**Auth:** Profil Zaufany → lex.gov.pl

---

### Poziom 3 — Kontrybutor instytucjonalny

**Kto:** urzędnik, poseł, radny, pracownik instytucji publicznej —
osoba działająca w imieniu instytucji w swojej roli

**Co może:**

- Tworzyć commity (zmiany w tekście dokumentu)
- Składać pull requesty z propozycjami poprawek
- Zamykać issues z obowiązkowym uzasadnieniem
- Zatwierdzać zmiany w dokumentach swojej instytucji
- Linkować zmiany do stenogramów i nagrań

**Każda akcja:** podpisana cyfrowo imieniem i nazwiskiem
oraz rolą instytucjonalną. Nieusuwalna z historii.

**Auth:** Profil Zaufany (tożsamość osoby fizycznej)

- mapowanie roli instytucjonalnej (poseł VIII kadencji,
  dyrektor departamentu X, radny gminy Y).

**Automatyczne wygasanie uprawnień:** mandat wygasa →
uprawnienia automatycznie spadają do Poziomu 1.
Koniec kadencji nie usuwa historii — usuwa możliwość zapisu.

---

### Poziom 4 — Administrator instytucji

**Kto:** sekretarz komisji, dyrektor departamentu,
osoba formalnie wyznaczona przez instytucję

**Co może:**

- Tworzyć nowe repozytoria dokumentów
- Nadawać i odbierać role kontrybutorów (Poziom 3)
- Archiwizować dokumenty po zakończeniu procedury
- Integrować zewnętrzne źródła (BAS, TK, EUR-Lex, UODO)
- Konfigurować powiadomienia i alerty o kolizjach

**Odpowiedzialność:** administrator instytucji odpowiada
prawnie za prawidłowość zawartości repozytorium instytucji.

---

### Poziom 5 — Administrator systemu

**Kto:** NASK / Ministerstwo Cyfryzacji

**Co może:**

- Rejestrować nowe instytucje w systemie
- Tworzyć repozytoria tematyczne
- Zarządzać integracjami zewnętrznymi na poziomie systemu
- Audytować logi dostępu
- Zarządzać infrastrukturą i bezpieczeństwem

---

## Mechanizm uwierzytelnienia

### Profil Zaufany jako fundament

Profil Zaufany to właściwy wybór — 15 milionów Polaków go ma.
Integracja z mObywatelem naturalna. Infrastruktura już istnieje.

**Dla Poziomu 2 (obywatel):**
Profil Zaufany → weryfikacja tożsamości → konto w lex.gov.pl

**Dla Poziomu 3 (kontrybutor instytucjonalny):**
Profil Zaufany (tożsamość osoby fizycznej)

- Rejestr Ról Instytucjonalnych (nowy komponent)
  → "Jan Kowalski, Profil Zaufany nr X, poseł VIII kadencji Sejmu RP,
  członek Komisji Cyfryzacji"

**Rejestr Ról Instytucjonalnych:**
Nowy komponent systemu — mapowanie tożsamości osobistych
na role instytucjonalne. Zasilany przez:

- PKW (mandaty posłów i senatorów po każdych wyborach)
- Kancelaria Sejmu (przynależność do komisji)
- Ministerstwa (pracownicy i ich role)
- Samorządy (radni, pracownicy urzędów)
- Kuratoria (dyrektorzy i nauczyciele szkół publicznych)

Rola aktywna = uprawnienia Poziomu 3.
Rola wygasła = automatyczny downgrade do Poziomu 1.

---

## Mechanizm forkowania

### Fork operacyjny

Instytucja lub klub parlamentarny tworzy własną gałąź dokumentu
żeby przygotować kontrpropozycję lub alternatywną wersję.

Fork jest publiczny — widoczne kto, kiedy i dlaczego.
Porównanie wersji (diff) dostępne dla każdego obywatela.

Przykład: Klub opozycyjny forkuje rządowy projekt ustawy
i składa własną wersję jako pull request do oficjalnego repozytorium Sejmu.

---

### Fork implementacyjny

Inne państwo, samorząd lub organizacja bierze kod platformy
i wdraża własną instancję.

Kod lex.gov.pl jest open source — może to zrobić każdy.
Polska nie kontroluje forków zewnętrznych — to jest cecha, nie błąd.

Implikacja dla PE: Parlament Europejski może sforkować polską implementację
i wdrożyć własną instancję bez budowania od zera.
Polska staje się referencyjną architekturą — jak Estonia z X-Road.

---

### Fork niedozwolony

Nie istnieje. Odczyt jest publiczny dla wszystkich.
To co jest regulowane to nie dostęp do danych,
tylko możliwość zapisu do oficjalnego repozytorium instytucji.

---

## Integracje zewnętrzne

| Źródło                          | Co dostarcza                                | Poziom integracji   |
| ------------------------------- | ------------------------------------------- | ------------------- |
| System Informacyjny Sejmu (SIS) | Stenogramy, nagrania, historia głosowań     | Automatyczna, API   |
| Biuro Analiz Sejmowych (BAS)    | Opinie prawne do projektów ustaw            | Półautomatyczna     |
| Trybunał Konstytucyjny          | Orzeczenia i ich status wykonania           | Automatyczna, API   |
| EUR-Lex (UE)                    | Dyrektywy i rozporządzenia UE               | Automatyczna, API   |
| ePUAP / mObywatel               | Profil Zaufany, auth                        | Automatyczna, API   |
| PKW                             | Mandaty wybieralne — zasilanie Rejestru Ról | Po każdych wyborach |
| Centrum Legislacji Rządowej     | Opinie legislacyjne rządu                   | Półautomatyczna     |
| UODO, UOKiK, KNF, NIK           | Opinie regulatorów branżowych               | Półautomatyczna     |
| GUS                             | Dane do weryfikacji OSR ex-post             | Na żądanie          |

---

## Publiczne API

Całość danych dostępna przez otwarte API.

**Co można pobrać:**

- Pełna historia zmian dowolnego dokumentu (format JSON/XML)
- Diff między dowolnymi dwiema wersjami dokumentu
- Lista wszystkich kolizji wykrytych między dokumentami
- Status implementacji dowolnej dyrektywy UE
- Historia orzeczeń TK dla konkretnego artykułu
- Wszystkie uwagi z konsultacji publicznych z ich statusami
- Harmonogram posiedzeń komisji z linkami do repozytoriów

**Kto używa:** dziennikarze, badacze, organizacje pozarządowe,
inne systemy państwowe, startupy civic tech, obywatele.

**Format:** REST API, GraphQL dla zapytań złożonych,
bulk download dla badań akademickich.

---

## Bezpieczeństwo i integralność

**Niemodyfikowalność historii:**
Git z natury nie pozwala na cichą modyfikację historii — każda zmiana
historii jest widoczna jako osobna operacja. Dodatkowe zabezpieczenie:
kryptograficzne podpisywanie każdego commitu przez Poziom 3 i 4.

**Audit log:**
Każda operacja w systemie logowana z timestampem, tożsamością
i treścią zmiany. Log niemodyfikowalny i dostępny publicznie.

**Backup i ciągłość:**
Trzy kopie geograficznie rozdzielone na terenie Polski.
RTO (czas przywrócenia): < 4 godziny.
RPO (maksymalna utrata danych): < 1 godzina.

**Zgodność regulacyjna:**

- RODO: dane osobowe kontrybutorów przetwarzane na podstawie
  art. 6 ust. 1 lit. e (zadanie publiczne)
- AI Act: jeśli system używa AI do detekcji kolizji —
  warstwa behawioralna Tesseract Protocol + pełny audit log
- Krajowe Ramy Interoperacyjności: natywna zgodność
- ISO 27001: certyfikacja NASK jako operatora

---

## Model kosztowy i finansowanie

**Infrastruktura:** finansowana centralnie przez budżet MC/NASK.
Instytucje nie płacą za korzystanie — to jest infrastruktura publiczna
jak drogi, nie usługa komercyjna.

**Wdrożenie pilotażowe (KM1, jedna komisja):**
Poniżej progu przetargowego .
Nie wymaga przetargu — wymaga decyzji.

**Skalowanie:**
Każda kolejna instytucja to konfiguracja i szkolenie,
nie nowa infrastruktura. Koszt marginalny bliski zeru
po uruchomieniu platformy.

**Open source:**
Kod platformy otwarty — społeczność może współtworzyć.
Utrzymanie i bezpieczeństwo po stronie NASK.

---

## Roadmapa wdrożeniowa

| Faza                | Zakres                                              | Czas                     | Próg przetargowy     |
| ------------------- | --------------------------------------------------- | ------------------------ | -------------------- |
| Pilot               | Jedna komisja sejmowa (KM1)                         | 6 miesięcy               | Poniżej — decyzja MC |
| Rozszerzenie Sejm   | Wszystkie komisje + Senat                           | 12 miesięcy              | Przetarg             |
| Rząd i ministerstwa | Rada Ministrów + 20 ministerstw                     | 18 miesięcy              | Przetarg             |
| Samorządy — pilotaż | 5 miast (Warszawa, Kraków, Gdańsk, Wrocław, Poznań) | 12 miesięcy              | Przetarg lub granty  |
| Samorządy — rollout | Wszystkie gminy i powiaty                           | 36 miesięcy              | Program rządowy      |
| Szkoły — pilotaż    | 100 szkół w 5 województwach                         | 12 miesięcy              | MEN + KPO            |
| PE — fork           | Parlament Europejski przejmuje architekturę         | Po zakończeniu fazy Sejm | Decyzja PE           |

---

## Jedno zdanie które opisuje cały system

> lex.gov.pl to infrastruktura która zamienia prawo z produktu końcowego
> w żywy, audytowalny proces — widoczny dla każdego obywatela
> od pierwszego zdania projektu do oceny skutków po trzech latach.

---

_Krzysztof Olbiński · Homo Digital · contact@homodigital.io · +48 503 520 004 · homodigital.io_
