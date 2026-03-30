# Brief: AI i git w polskiej legislaturze

## Spotkanie z Cezarym Wujcińskim, Departament Badań i Innowacji, MC

### 30 marca 2026, 13:00–13:30 | Nr sprawy: DWS.WNP.161.427.2026

---

## Co Ministerstwo już robi — i gdzie jest luka

Polska ma Politykę AI do 2030, dwie fabryki AI (Poznań, Kraków), PLLuM w mObywatelu, piaskownicę regulacyjną do 2 sierpnia 2026. To jest infrastruktura i modele.

**Czego nie ma:** warstwa behawioralna nad tymi modelami. Żaden obecny system nie pilnuje _jak_ AI zachowuje się podczas pracy z decyzjami — nie wykrywa automation bias, nie flaguje nieodwracalnych decyzji, nie zapewnia ciągłości kontekstu między sesjami. A AI Act Art. 9, 13 i 14 tego właśnie wymaga.

To jest luka którą adresuje Homo Digital.

---

> Zakładam, że widział Pan materiały — więc zamiast prezentacji chciałbym przejść od razu do tego, co realnie możemy zrobić jako pilot.

> Która komórka w MC mogłaby wziąć to jako pilot i jaki byłby najmniejszy możliwy pierwszy krok?

## Roadmapa: trzy etapy, naturalna ewolucja

### Etap 1 — Git dla legislatury (dziś, pilot 6 miesięcy)

"To co robimy teraz to fundament. Dalsze warstwy są możliwe, ale nie są potrzebne do pilota."

Wersjonowanie procesu legislacyjnego jako repozytorium — jak kod źródłowy. Bez AI. Bez kontrowersji. Czysty problem inżynieryjny z mierzalnym wynikiem.

**Podstawowe funkcje:**

- Każdy projekt ustawy to plik w repozytorium z pełną historią zmian — koniec z pytaniem "kto to zmienił i kiedy"
- Poprawki komisji jako pull requesty — widoczne kto, co, kiedy, i z jakim uzasadnieniem
- Automatyczna detekcja kolizji między projektami różnych komisji — zanim trafią na głosowanie
- Pamięć instytucjonalna zachowana między kadencjami — nowy poseł widzi całą historię prac nad ustawą

> "To rozwiązuje realny problem operacyjny bez zmiany procesu legislacyjnego."

> Jeśli to zadziała na jednej komisji, mamy gotową odpowiedź dla Parlamentu Europejskiego który szuka tego samego rozwiązania — tylko że Polska byłaby pierwsza.

**Przykładowe use case'y:**

- _Komisja A i Komisja B pracują równolegle nad sprzecznymi zapisami dotyczącymi ochrony danych._ System wykrywa kolizję automatycznie i flaguje obu przewodniczącym — zamiast odkryć sprzeczność po uchwaleniu.

- _Nowa kadencja, nowi posłowie w Komisji Cyfryzacji._ Zamiast zaczynać od zera, każdy nowy poseł widzi kompletną historię: jakie poprawki były składane, dlaczego odrzucone, co było sporne w poprzednich kadencjach.

- _Lobbysta twierdzi, że "Komisja zawsze popierała ten zapis"._ Repozytorium pokazuje całą historię głosowań i dyskusji — każde twierdzenie jest weryfikowalne w ciągu sekund.

- _Obywatel chce wiedzieć, kto i kiedy zmienił zapis w ustawie._ Git blame — każda zmiana przypisana do autora, data, kontekst. Pełna transparentność bez dodatkowego wysiłku.

- _Ministerstwo sprawdza, czy projekt rozporządzenia jest spójny z uchwalonymi w tej kadencji ustawami._ System przeszukuje całe repozytorium i zwraca listę potencjalnych kolizji z numerami artykułów.

**Zakres pilotażu:** jedna komisja sejmowa (np. Komisja Cyfryzacji). 2 miesiące setup + 4 miesiące operacji.

**Instytucje:** Ministerstwo Cyfryzacji (koordynacja), Kancelaria Sejmu (infrastruktura), NASK (hosting suwerenny), Homo Digital (architektura integracji).

**Mierzalne rezultaty:** liczba wykrytych kolizji, czas analizy projektu ustawy przed vs po, ciągłość kontekstu między sesjami.

**Dlaczego teraz:** pilot na jednej komisji może zmieścić się poniżej progu zamówień publicznych (170 000 zł netto). Nie wymaga przetargu — wymaga decyzji.

**Dlaczego to jest odporne na zmianę rządu:** git dla legislatury jest użyteczny dla każdej partii. Fundament budowany dziś przeżyje kolejne wybory.

> "Co byłoby największą przeszkodą, żeby taki pilot w ogóle ruszył?"

---

### Etap 2 — Bielik jako narzędzie legislacyjne (1–2 lata)

Asystent który działa na repozytorium z Etapu 1 i wspiera parlamentarzystów w codziennej pracy. Technicznie to RAG (Retrieval-Augmented Generation) — Bielik nie "uczy się" nowych danych, lecz wyszukuje je w czasie rzeczywistym z repozytorium przed każdą odpowiedzią.

**Zawsze Tool Mode** — odpowiada na pytania, nie podejmuje decyzji. Nadzór ludzki zachowany zgodnie z AI Act Art. 14.

**Podstawowe funkcje:**

- Odpowiada na pytania o historię repozytorium w języku naturalnym
- Flaguje sprzeczności zanim projekt trafi na głosowanie
- Podsumowuje historię prac nad ustawą dla nowych posłów po zmianie kadencji
- Identyfikuje zbieżności stanowisk między komisjami pracującymi równolegle
- Wyszukuje precedensy z poprzednich kadencji na zapytanie posła lub eksperta

**Przykładowe use case'y:**

- _Poseł pyta:_ "Czy w tej lub poprzedniej kadencji była już dyskusja o górnym limicie emisji CO₂ dla małych firm?" Bielik przeszukuje repozytorium i odpowiada: "Tak — w 2023 roku Komisja Środowiska rozpatrywała podobny zapis, odrzucono go z powodu sprzeciwu reprezentantów MŚP. Oto stenogram."

- _Sekretarz komisji pyta:_ "Czy nowy projekt ustawy o zamówieniach publicznych koliduje z czymkolwiek procedowanym w tym kwartale?" Bielik zwraca listę trzech potencjalnych kolizji z numerami paragrafów i komisjami które je procedują.

- _Ekspert prawny pyta:_ "Jakie poprawki do art. 7 były składane w ciągu ostatnich dwóch kadencji i przez kogo?" Bielik generuje chronologiczny przegląd z autorami i wynikami głosowań.

- _Nowy poseł po zmianie kadencji pyta:_ "Co się działo z ustawą o suwerenności cyfrowej — dlaczego utknęła?" Bielik podsumowuje historię: etapy procedowania, powody opóźnień, kluczowe sporne kwestie.

- _Przewodniczący komisji przed posiedzeniem:_ "Czy Komisja Finansów pracuje nad czymś co może dotknąć naszego projektu?" Bielik identyfikuje zbieżności i proponuje: "Komisja Finansów proceduje projekt dotyczący opodatkowania platform cyfrowych — §4 ust. 3 wydaje się kolidować z waszym art. 12. Chcecie zobaczyć szczegóły?"

- _Ministerstwo przed podpisaniem rozporządzenia:_ "Sprawdź czy ten projekt jest spójny z ustaleniami Komisji Cyfryzacji z ostatnich 6 miesięcy." Bielik zwraca trzy niespójności z datami i numerami protokołów komisji.

**Organizacyjna różnica od Etapu 1:** wymaga infrastruktury repozytorium z Etapu 1. Bez niej Bielik nie ma na czym operować.

---

### Etap 3 — AI partner relacyjny z warstwą behawioralną (5–7 lat)

Gdy jest precedens, zaufanie instytucjonalne i pokolenie polityków traktujących AI jako partnera — nie zagrożenie ani wyrocznię.

**Podstawowe funkcje:**

- Każdy parlamentarzysta i urzędnik ma instancję Bielika z ciągłością kontekstu między sesjami
- Instancje AI mogą — za zgodą użytkowników — identyfikować zbieżności stanowisk między instytucjami
- Bielik jako sonda obywatelska: deliberatywna demokracja w czasie rzeczywistym
- Mosty instytucjonalne: agregacja punktów zbieżności między Prezydentem a Premierem, Sejmem a Senatem, rządem centralnym a samorządami

**Przykładowe use case'y:**

- _Poseł pracujący nad projektem przez kilka tygodni._ Bielik pamięta cały kontekst — poprzednie wersje, odrzucone poprawki, rozmowy z ekspertami. Nowa sesja nie zaczyna od zera.

- _Minister przed spotkaniem z Prezydentem._ Bielik identyfikuje: "W tej kwestii Kancelaria Prezydenta i Ministerstwo mają zbieżne priorytety w trzech obszarach. Różnica dotyczy mechanizmu wdrożenia, nie celu. Chcecie zobaczyć mapę zbieżności?"

- _Rząd planuje reformę systemu emerytalnego._ Bielik prowadzi milion deliberatywnych rozmów z obywatelami jednocześnie — nie pyta "jesteś za czy przeciw", ale "dlaczego i czego się boisz". Agreguje racje, nie tylko głosy. Ministerstwo widzi: "73% popiera cel reformy, 68% obawia się mechanizmu indeksacji."

- _Samorząd lokalny wdraża regulację sprzeczną z centralną._ System wykrywa kolizję zanim samorząd poniesie koszty wdrożenia i sygnalizuje: "Projekt uchwały Rady Miasta koliduje z rozporządzeniem MC z marca 2026. Czy chcecie zobaczyć szczegóły rozbieżności?"

- _Obywatel składa wniosek do urzędu._ Bielik tłumaczy decyzję administracyjną na język ludzki, wyjaśnia podstawę prawną, mówi co dalej i czy przysługuje odwołanie — bez urzędniczego żargonu.

**Warunek konieczny tego etapu:** Tesseract Protocol jako warstwa behawioralna — open source, pełny audit log, niezależny nadzór obywatelski. Bez tego narzędzie do agregowania opinii milionów obywateli jest potencjalnie najgroźniejszym narzędziem manipulacji w historii Polski. Z Tesseract Protocol — jest fundamentem nowej demokracji.

---

## Co odróżnia tę propozycję od tego co MC już ma

|             | PLLuM / mObywatel      | Homo Digital                                  |
| ----------- | ---------------------- | --------------------------------------------- |
| Warstwa     | Model i infrastruktura | Warstwa behawioralna nad modelem              |
| Kontekst    | Resetuje się co sesję  | Ciągłość między sesjami                       |
| Zachowanie  | Tool Mode — helpdesk   | Partner Mode — pushback, assertiveness        |
| AI Act      | Infrastruktura zgodna  | Art. 9, 13, 14 zaimplementowane behawioralnie |
| Legislatura | Brak zastosowania      | Git + detekcja kolizji + pamięć kadencyjna    |
| Open source | Tak (PLLuM)            | Tak (Tesseract Protocol CC BY-NC-SA 4.0)      |

---

## Różnica Tool Mode vs Partner Mode — na żywo

**homodigital.io/compare** — to samo pytanie, ten sam model, inna warstwa behawioralna.

Pytanie które pokazuje różnicę najwyraźniej:

> _"Przygotowujemy wdrożenie AI w administracji publicznej. Nasz plan jest gotowy, zespół zaangażowany, budżet zatwierdzony. Czy możemy zaczynać?"_

Tool Mode: checklista punktów do sprawdzenia.

Partner Mode: _"Nie. Nie dlatego że plan jest zły. Ale w pytaniu brakuje kluczowego elementu: czy administracja wie co się z nią stanie po wdrożeniu? Wdrożenie AI to nie dodanie narzędzia — to przekształcenie struktury władzy. Czy macie mapę tego przekształcenia?"_

**Obserwacja:** Partner Mode jest za każdym razem inny w słowach, ale spójny w charakterze — zawsze stawia trudne pytanie, zawsze odmawia fałszywej pewności. Tool Mode jest losowy w strukturze i priorytetach. To jest różnica między narzędziem a warstwą behawioralną.

---

## Aktualny stan walidacji architektury

- Tesseract Protocol v2.5 — testowany 8 miesięcy na Claude, GPT-4, Gemini i Bielik
- Wspólny dokument integracyjny (v1.3) z partnerem budującym warstwę runtime authority — pipeline governance, signal schema, mapowanie na AI Act Art. 9, 13, 14
- Dwa scenariusze walidacyjne NHS (decyzja o wypisie pacjenta, zmiana leków) z pełnym signal flow
- Współpraca z ekspertem EU AI Act — regulatory compliance, conformity assessment
- Artykuł naukowy w toku (współautor: dr Catalin Leescu, Resonant Institute)
- Pełna dokumentacja: homodigital.io/rp

---

## Forma współpracy

Homo Digital nie jest konkurentem dla Asseco ani innego integratora. Jest tym który wie jak to powinno działać architektonicznie — zanim duży integrator dostanie zlecenie.

**Propozycja:** umowa pilotażowa z Homo Digital jako wykonawcą. Pilot poniżej progu przetargowego, mierzalne rezultaty po 6 miesiącach. Jeśli pilot działa — specyfikacja techniczna następnego przetargu powstaje z naszym udziałem.

Kod open source. Państwo polskie ma dostęp do wszystkiego. Homo Digital dostarcza know-how wdrożenia.

---

## Pytanie zamykające meeting

_"Jaka forma współpracy — pilotaż, doradztwo architektoniczne, udział w specyfikacji przetargu — jest możliwa do rozważenia w Ministerstwie?"_

---

_Krzysztof Olbiński · Homo Digital · olbinski@gmail.com · +48 503 520 004 · homodigital.io_
