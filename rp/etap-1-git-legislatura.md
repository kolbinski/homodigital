# Git dla legislatury — Pilot

## Spotkanie z Cezarym Wujcińskim, Departament Badań i Innowacji, MC

### 30 marca 2026, 13:00–13:30 | Nr sprawy: DWS.WNP.161.427.2026

---

> _„Zakładam, że widział Pan materiały — więc zamiast prezentacji chciałbym przejść od razu do tego, co realnie możemy zrobić jako pilot."_

---

> _„Nie zmieniamy procesu legislacyjnego, nie zmieniamy prawa, nie zmieniamy kompetencji komisji."_

---

## Co budujemy w pilotażu

Każdy projekt ustawy to plik w repozytorium z pełną historią zmian - tak jak w każdym systemie dokumentacyjnym. Kto zmienił i kiedy. Nie ocenia, nie rozlicza. Czyli sekretariat komisji pracuje na tym jak na Google Docs — tylko z historią zmian.
Poprawki komisji jako pull requesty — widoczne kto, co, kiedy, z jakim uzasadnieniem.
Automatyczna detekcja kolizji między projektami różnych komisji.
Pamięć instytucjonalna zachowana między kadencjami.

**Bez AI. Bez kontrowersji. Czysty problem inżynieryjny.**

---

## Dwa use case'y

**Komisja A i Komisja B** pracują równolegle nad sprzecznymi zapisami
dotyczącymi ochrony danych. System wykrywa kolizję automatycznie
i flaguje obu przewodniczącym — zanim trafią na głosowanie.

**Nowa kadencja, nowi posłowie.** Zamiast zaczynać od zera,
każdy widzi kompletną historię: jakie poprawki były składane,
dlaczego odrzucone, co było sporne w poprzednich kadencjach.

---

## Zakres pilotażu

**Jedna komisja sejmowa.**
Rekomendacja: Komisja Cyfryzacji, Innowacyjności i Nowoczesnych Technologii.

- 2 miesiące setup: repozytorium, migracja projektów, szkolenie sekretariatu
- 4 miesiące operacji: codzienna praca komisji z repozytorium
- Mierzalne rezultaty po 6 miesiącach: decyzja o rozszerzeniu

**Poniżej progu przetargowego (130k EUR).**
Nie wymaga przetargu — wymaga decyzji. Ale decyzja nie musi być dziś — chciałem tylko pokazać że próg wejścia jest niski.

**Odporne na zmianę rządu.**
Git dla legislatury jest użyteczny dla każdej partii.
Fundament budowany dziś przeżyje kolejne wybory.

**Instytucje:** Ministerstwo Cyfryzacji (koordynacja), Kancelaria Sejmu
(infrastruktura), NASK (hosting suwerenny), Homo Digital (architektura)

---

## Pytanie zamykające

_„Jaki byłby najmniejszy możliwy pierwszy krok żeby uruchomić pilotaż
repozytorium na jednej komisji?"_

---

## Implementacja

Technologie są gotowe i otwarte — to jest kwestia konfiguracji i integracji, nie budowania od zera. Dokładny budżet i zespół ustalamy po tym jak wiemy jaka infrastruktura już istnieje po stronie Kancelarii Sejmu.

### Budżet

Dokładny budżet zależy od tego co Kancelaria Sejmu ma już jako infrastrukturę — nie chcę podawać liczby zanim nie wiem na czym stoimy technicznie. Ale zakres KM1 celowo mieści się poniżej progu przetargowego.

### Zespół

Krzysztof Olbiński jako architekt integracji. Kodowanie repozytorium i interfejsu — to jest praca dla 2-3 doświadczonych deweloperów. Mam sieć kontaktów ale nie masz jeszcze named team — i że to zależy od formy współpracy którą Ministerstwo zaproponuje.

### Technologie

- Git jako silnik wersjonowania — open source, istniejący standard
- Gitea lub GitLab CE jako platforma — open source, self-hosted, polska jurysdykcja
- Hosting: NASK — już mają infrastrukturę
- Auth: Profil Zaufany — już istnieje
- Format dokumentów: Markdown lub XML (ISAP już używa XML dla aktów prawnych)

To są wybory technologiczne które nie tworzą vendor lock-in.

---

---

## ⬇ JEŚLI CEZARY ZAPYTA — materiał do rozwinięcia

_Poniższe sekcje nie wychodzą na call z własnej inicjatywy._
_Używasz ich tylko jeśli Cezary sam pociągnie temat._

---

### Jeśli zapyta: „A co po KM1?"

**Sześć kamieni milowych, każdy działa samodzielnie:**

| Kamień milowy              | Miesiące | Co dodaje                                           |
| -------------------------- | -------- | --------------------------------------------------- |
| 1. Repozytorium tekstu     | 1–2      | Fundament — historia zmian, detekcja kolizji        |
| 2. Stenogramy i nagrania   | 3–4      | Każda zmiana z linkiem do debaty która ją stworzyła |
| 3. Ekspertyzy i opinie     | 5        | Opinie BAS, TK, UODO przypisane do artykułów        |
| 4. Konsultacje publiczne   | 6        | Obywatel śledzi losy swojej uwagi                   |
| 5. TK i prawo UE           | 7–8      | Automatyczny audyt zgodności z dyrektywami          |
| 6. Oceny skutków regulacji | 9–10     | Prognoza OSR vs rzeczywiste skutki po 2–3 latach    |

KM2–KM6 można realizować częściowo równolegle po uruchomieniu KM1.

---

#### KM2 — Stenogramy i nagrania (miesiące 3–4)

**Co budujemy:**

- Każdy commit podlinkowany do konkretnego miejsca w stenogramie gdzie zmiana była dyskutowana
- Linkowanie commitów do timestampu nagrania wideo z posiedzenia
- Jeden klik na zmianę w §7 → film dokładnie w momencie gdy poseł ją zgłaszał

**Dlaczego to jest ważne:**
Dziś stenogramy i tekst ustawy to dwie osobne wyspy. Poseł mówi "zmieniam §7 z 24 na 72 godziny" — stenogram rejestruje wypowiedź, ale nie ma powiązania z konkretną zmianą w tekście. Połączenie tworzy pełny łańcuch: **tekst → zmiana → debata → autor → głosowanie.** Tego nie ma żaden parlament na świecie.

**Przykładowe use case'y:**

- Badacz analizuje ewolucję przepisów o ochronie danych. Widzi każdą zmianę z linkiem do debaty która ją poprzedzała.
- Dziennikarz sprawdza czy poseł głosował zgodnie z tym co mówił na komisji. Jedno zapytanie.
- Nowy minister przejmuje resort. Zamiast briefingów — historia kluczowych regulacji z kontekstem debat.

**Źródła danych:** System Informacyjny Sejmu (SIS) — stenogramy są już cyfrowe i częściowo ustrukturyzowane. Nagrania wideo Sejmu są publicznie dostępne.

**Mierzalne rezultaty:** odsetek commitów z podlinkowanym stenogramem, czas wyszukiwania kontekstu dla konkretnej zmiany

---

#### KM3 — Ekspertyzy i opinie prawne (miesiąc 5)

**Co budujemy:**

- Opinie Biura Analiz Sejmowych (BAS) jako attachmenty do konkretnych paragrafów
- Opinie Centrum Legislacji Rządowej przypisane do artykułów których dotyczą
- Opinie organów zewnętrznych (UOKiK, UODO, KNF, NIK) linkowane do odpowiednich zapisów
- Historia analiz dla każdego artykułu — chronologicznie, z autorami i zakresem

**Dlaczego to jest ważne:**
Opinie prawne kształtują brzmienie przepisów — ale dziś nie ma bezpośredniego powiązania między opinią a artykułem którego dotyczy. Wiedza ekspercka żyje osobno od tekstu który zmienia.

**Przykładowe use case'y:**

- Komisja pracuje nad nowelizacją artykułu. Widzi od razu wszystkie opinie które go kształtowały — łącznie z odrzuconymi i uzasadnieniami odrzucenia.
- Za 3 lata ktoś pyta "dlaczego ten zapis wygląda tak a nie inaczej." Widzi całą historię analiz.
- Ministerstwo sprawdza czy projektowane rozporządzenie było już analizowane przez BAS w podobnym kontekście.

**Źródła danych:** BAS publikuje opinie na stronach sejmowych — dostępne, ale niezindeksowane względem artykułów. Praca integracyjna, nie tworzenie od zera.

**Mierzalne rezultaty:** odsetek artykułów z przypisanymi opiniami, czas wyszukiwania opinii dla konkretnego zapisu

---

#### KM4 — Konsultacje publiczne (miesiąc 6)

**Co budujemy:**

- Każda konsultacja publiczna jako issue w repozytorium
- Etykietowanie: uwzględniono / odrzucono / częściowo uwzględniono / w toku
- Komentarz uzasadnienia dla każdej uwagi — obowiązkowy, publiczny
- Historia wszystkich zgłoszonych uwag per artykuł per projekt

**Dlaczego to jest ważne:**
Dziś konsultacje trafiają do ministerstwa jako worki maili i pism — bez struktury, bez śledzenia co zostało uwzględnione. Obywatel który składał uwagę nigdy nie wie co się z nią stało.

**Przykładowe use case'y:**

- NGO składa uwagę do projektu ustawy o AI. Po trzech miesiącach może sprawdzić: uwzględniono, odrzucono, z jakim uzasadnieniem.
- Ministerstwo przygotowuje kolejną nowelizację. Widzi jakie uwagi były zgłaszane do poprzedniej wersji — nie pyta ponownie o te same rzeczy.
- Dziennikarz sprawdza które uwagi lobbystów zostały uwzględnione, a które uwagi NGO odrzucone. Dane publiczne i ustrukturyzowane.

**Mierzalne rezultaty:** odsetek uwag z przypisanym statusem i uzasadnieniem, czas między złożeniem uwagi a aktualizacją statusu

---

#### KM5 — Orzecznictwo TK i prawo UE (miesiące 7–8)

**Co budujemy:**

- Automatyczny tag na artykułach które były przedmiotem orzeczeń TK
- Link do pełnej treści orzeczenia z poziomu konkretnego przepisu
- Status: "przepis wymaga nowelizacji" / "przepis uznany za zgodny" / "wykonanie w toku"
- Każdy artykuł implementujący dyrektywę UE linkowany do oryginalnego tekstu dyrektywy
- Flagi opóźnienia implementacji: dyrektywa wymaga wdrożenia do daty X, status: Y

**Dlaczego to jest ważne:**
Orzeczenia TK i dyrektywy UE to zewnętrzne ograniczenia które kształtują tekst prawa — ale dziś żyją osobno w bazach prawnych, niepowiązane z konkretnymi artykułami które dotyczą.

**Przykładowe use case'y:**

- Komisja pracuje nad artykułem kwestionowanym przez TK. Widzi to od razu — bez konsultacji z prawnikami.
- Audyt zgodności z prawem unijnym staje się automatyczny — bez zewnętrznych konsultantów porównujących teksty ręcznie.
- Komisja Europejska pyta o stan implementacji AI Act. Odpowiedź to jedno zapytanie do repozytorium.

**Źródła danych:** Orzeczenia TK publicznie dostępne. Teksty dyrektyw UE dostępne w EUR-Lex z API.

**Mierzalne rezultaty:** odsetek artykułów z przypisanymi orzeczeniami TK, odsetek dyrektyw z mapowaniem na artykuły implementujące

---

#### KM6 — Oceny Skutków Regulacji (miesiące 9–10)

**Co budujemy:**

- Każda OSR przypisana do konkretnych artykułów których dotyczy
- Prognozowane skutki przy uchwaleniu — jako dane strukturalne, nie tekst narracyjny
- Mechanizm porównania: prognoza OSR vs rzeczywiste skutki po 2–3 latach
- Automatyczne alerty: "dla tej ustawy minęły 2 lata — czas na ocenę ex-post"

**Dlaczego to jest ważne:**
Nikt systematycznie nie wraca do sprawdzenia czy prognozowane skutki się zmaterializowały. To jest learning loop którego polskie prawotwórstwo nigdy nie miało.

**Przykładowe use case'y:**

- Komisja pracuje nad nowelizacją ustawy o zamówieniach. Widzi OSR z 2019 i raport ex-post z 2022 który pokazuje że 40% prognoz się nie zmaterializowało. To zmienia dyskusję.
- NIK audytuje jakość OSR. Zamiast ręcznego porównywania dokumentów — jedno zapytanie.
- Badacze akademiccy analizują skuteczność procesu legislacyjnego. Mają ustrukturyzowane dane za ostatnie dekady.

**Mierzalne rezultaty:** odsetek ustaw z kompletną OSR w repozytorium, liczba przeprowadzonych ocen ex-post, odchylenie prognoza vs rzeczywistość

---

### Jeśli zapyta: „A lobbing?"

Git nie eliminuje lobbingu — eliminuje lobbing który nie chce być widoczny.
Dziś lobbista może wpłynąć na zmianę zapisu i nikt nie powie kiedy ta zmiana weszła,
kto ją zaproponował i w jakim kontekście. W git każda zmiana ma autora, datę i kontekst.
System nie oskarża. Pokazuje. Resztę robi jawność.

---

### Jeśli zapyta: „A szkoły i samorządy?"

Ta sama architektura, różne instancje.

**Samorząd:** budżet gminy jako kod (każdy aneks widoczny z datą i autorem),
zamówienia publiczne jako issues z trackerem statusu,
Miejscowy plan zagospodarowania przestrzennego — koniec z pytaniami "skąd ten wieżowiec się wziął?"

**Szkoły:** curriculum jako repozytorium (dobra lekcja forkowana między nauczycielami),
ocena procesu ucznia a nie tylko produktu,
zmiany podstawy programowej widoczne bez porównywania PDFów.

---

### Jeśli zapyta: „A Europa?"

Jeśli pilot na jednej komisji zadziała — mamy gotową odpowiedź
dla Parlamentu Europejskiego który szuka tego samego rozwiązania.
Polska byłaby pierwsza. Tak jak Estonia z X-Road.

Nie partnerstwo wdrożeniowe teraz — endorsement i obserwatorzy.
Partnerstwo po dowodzie koncepcji.

---

## Jedno zdanie które kończy każdy wątek

> _„To rozwiązuje realny problem operacyjny bez zmiany procesu legislacyjnego."_

---

_Krzysztof Olbiński · Homo Digital · olbinski@gmail.com · +48 503 520 004 · homodigital.io_
