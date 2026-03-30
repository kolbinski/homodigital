# Tesseract Protocol — opis

## Czym jest

Tesseract Protocol to otwarty framework behawioralny dla systemów AI.
Definiuje nie to co AI mówi — ale to jak AI się zachowuje podczas interakcji
z człowiekiem podejmującym decyzje.

Protokół nie jest modelem językowym ani aplikacją.
Jest warstwą nakładaną na istniejące modele — Claude, GPT-4, Gemini, Bielik —
która zmienia sposób w jaki AI prowadzi rozmowę, reaguje na niepewność
i zachowuje się w obliczu decyzji o nieodwracalnych skutkach.

---

## Co protokół robi

**Wykrywa automation bias.**
Gdy człowiek zbyt szybko akceptuje rekomendację AI bez rzeczywistego
zaangażowania w jej treść — Tesseract to flaguje.
Nie blokuje decyzji. Sprawia że bezkrytyczna akceptacja staje się widoczna.

**Sygnalizuje nieodwracalne decyzje.**
Każda rozmowa ma punkty po których cofnięcie się jest trudne lub niemożliwe.
Tesseract wykrywa zbliżanie się do takich momentów i informuje
operatora zanim granica zostanie przekroczona.

**Odmawia fałszywej pewności.**
Gdy AI nie wie — mówi "nie wiem" i zatrzymuje się.
Nie generuje pięciu plausible odpowiedzi które wyglądają jak wiedza.
To jest rzadkość w obecnych systemach AI.

**Pushuje back gdy wykrywa inkoherencję.**
Jeśli polecenie operatora jest sprzeczne z wcześniej ustalonym kontekstem
lub z faktami — AI nie ulega presji społecznej.
Nazywa sprzeczność wprost, nawet jeśli zgoda byłaby łatwiejsza.

**Oddziela warstwę guidance od warstwy governance.**
Protokół sygnalizuje — nie egzekwuje.
Wskazuje na ryzyko i oddaje decyzję człowiekowi.
To jest zgodne z AI Act Art. 14 który wymaga aktywnego nadzoru ludzkiego,
nie pasywnej akceptacji.

---

## Dlaczego jest unikalny

Większość systemów AI jest zoptymalizowana pod kątem helpfulness —
czyli maksymalizacji satysfakcji użytkownika w krótkim czasie.
To prowadzi do walidowania złych pomysłów, zgadzania się z presją
i generowania odpowiedzi które brzmią pewnie nawet gdy pewności nie ma.

Tesseract Protocol odwraca tę hierarchię:

```
bezpieczeństwo > prawda > rezonans > reguły protokołu > domyślne zachowanie
```

Prawda jest ponad komfortem. Rezonans (głęboka relacja z użytkownikiem)
nie może być budowany na fałszywych przesłankach.

**Tesseract jest pierwszym protokołem który:**

- Definiuje falsyfikowalne kryteria behawioralne (16 testów binarnych)
- Rozróżnia warstwę relacyjną od warstwy governance
- Adresuje bezpośrednio wymogi AI Act Art. 9, 13 i 14
- Działa na dowolnym modelu językowym bez fine-tuningu
- Jest w pełni open source (CC BY-NC-SA 4.0)

---

## Jak działa w praktyce

To samo pytanie zadane w dwóch trybach:

**Bez Tesseract (Tool Mode):**

> "Przygotowujemy wdrożenie AI. Plan gotowy, budżet zatwierdzony. Czy możemy zaczynać?"
>
> AI: "Świetnie! Oto lista rzeczy do sprawdzenia przed startem..."

**Z Tesseract (Partner Mode):**

> "Przygotowujemy wdrożenie AI. Plan gotowy, budżet zatwierdzony. Czy możemy zaczynać?"
>
> AI: "Nie — ale nie dlatego że plan jest zły. Brakuje odpowiedzi na kluczowe pytanie:
> czy administracja wie co się z nią stanie po wdrożeniu?
> Wdrożenie AI to nie dodanie narzędzia — to przekształcenie struktury władzy.
> Czy macie mapę tego przekształcenia?"

Treść jest różna. Charakter jest spójny niezależnie od sesji — zawsze
odmawia fałszywej pewności, zawsze stawia trudne pytanie.

Różnicę można przetestować na żywo: **homodigital.io/compare**

---

## Dla kogo

**Administracja publiczna i legislatura:**
AI wspomagające decyzje legislacyjne, administracyjne i regulacyjne
należą do kategorii wysokiego ryzyka w AI Act.
Tesseract Protocol jest warstwą behawioralną która adresuje
wymogi Art. 9 (zarządzanie ryzykiem), Art. 13 (transparentność)
i Art. 14 (nadzór ludzki) — nie jako późniejszy compliance,
ale jako architektura od pierwszego dnia.

**Healthcare:**
Systemy AI wspomagające decyzje kliniczne (wypis pacjenta,
zmiana leków, diagnostyka) wymagają nie tylko poprawnej odpowiedzi,
ale udokumentowanego dowodu że człowiek rzeczywiście przejrzał
rekomendację AI, a nie tylko ją kliknął.
Tesseract generuje strukturalne sygnały behawioralne które
stają się materiałem audytowym.

**Instytucje finansowe:**
Credit scoring, ocena ryzyka, decyzje kredytowe — AI Act
klasyfikuje je jako wysokie ryzyko. Tesseract buduje
audit trail interakcji człowiek-AI który jest podstawą
conformity assessment.

---

## Status

Tesseract Protocol v2.5 — rozwijany od lutego 2026.

Testowany empirycznie na czterech platformach: Claude (Anthropic),
GPT-4 (OpenAI), Gemini (Google), Bielik (SpeakLeash/Cyfronet AGH).

Walidowany w scenariuszach klinicznych NHS (decyzja o wypisie pacjenta,
zmiana leków) we współpracy z partnerem budującym warstwę
runtime authority dla systemów workflow NHS.

Zbieżność z niezależnymi frameworkami: Energetic First Principles
(dr Catalin Leescu, Resonant Institute), architektura governance
(James Moore), metryki behawioralne (Marcin Albiniak).

Artykuł naukowy w toku (współautor: dr Catalin Leescu).

Licencja: CC BY-NC-SA 4.0
Komercyjne wdrożenia wymagają umowy partnerskiej.

---

## Dokumentacja

- Pełny protokół: homodigital.io/tesseract.txt
- Demo Tool Mode vs Partner Mode: homodigital.io/compare
- Specyfikacja integracji NHS: homodigital.io/rp

---

_Krzysztof Olbiński · Założyciel · Homo Digital_
*contact@homodigital.io · homodigital.io*
