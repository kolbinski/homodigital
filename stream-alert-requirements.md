# StreamAlert — Wymagania produktu i tech stack

## Pomysł

Aplikacja która wysyła powiadomienia gdy premierowy film pojawia się na platformach streamingowych wykupionych przez użytkownika. Globalny produkt — każdy kraj ma inne biblioteki (Netflix PL ≠ Netflix USA). Model: $5/miesiąc.

---

## Wymagania funkcjonalne

**Core features:**
- Rejestracja i logowanie (Google OAuth)
- Wybór kraju użytkownika
- Wybór platform streamingowych które user ma wykupione (Netflix, Disney+, HBO Max, Amazon Prime, Apple TV+, itd.)
- Przeglądanie nadchodzących premier kinowych
- Automatyczne powiadomienia gdy film z listy obserwowanych pojawia się na wybranej platformie w kraju użytkownika
- Lista "obserwowanych" filmów (watchlist)
- Ustawienia powiadomień (email, web push, opcjonalnie mobile push)

**Nice to have:**
- Oceny i rekomendacje (na podstawie gatunków które user lubi)
- Trailer w aplikacji
- Sharing watchlisty ze znajomymi

---

## Model biznesowy

- Free tier: max 5 filmów na watchliście, brak powiadomień
- Premium: $5/miesiąc — nieograniczona watchlista, powiadomienia real-time, wszystkie platformy, wszystkie kraje
- Płatności: Stripe Subscriptions

---

## Tech stack

### Frontend
- **React + Next.js** (App Router) + TypeScript
- Tailwind CSS
- PWA (Progressive Web App) — web push notifications bez appki mobilnej na starcie

### Backend
- **Node.js + TypeScript**
- **Apollo Server** — GraphQL API
- **PostgreSQL** — baza danych (Supabase — darmowy start, zero DevOps)
- **Supabase Auth** — Google OAuth out-of-the-box

### Zewnętrzne API
- **TMDB API** (The Movie Database) — darmowe, ogromna baza filmów, obsługa regionów i dostępności streamingowej per kraj. Dokumentacja: https://developer.themoviedb.org
- **JustWatch** — dane o dostępności filmów na platformach streamingowych per kraj (nieoficjalne API lub web scraping)

### Powiadomienia
- Web Push API (PWA) — działa na desktop i Android bez appki
- Email: Resend lub SendGrid (darmowy tier wystarczy na start)

### Płatności
- **Stripe** — Stripe Subscriptions dla modelu $5/miesiąc

### Deploy
- **Vercel** — frontend + API routes, darmowy tier
- **Supabase** — baza danych, darmowy tier

**Koszt infrastruktury na start:** ~$0/miesiąc

---

## Architektura GraphQL

```graphql
type Movie {
  id: ID!
  title: String!
  releaseDate: String!
  posterUrl: String
  genres: [String]
  streamingOn: [StreamingProvider]
}

type StreamingProvider {
  name: String!
  country: String!
  url: String
}

type User {
  id: ID!
  email: String!
  country: String!
  platforms: [String]
  watchlist: [Movie]
}

type Query {
  upcomingMovies(country: String!): [Movie]
  watchlist: [Movie]
  searchMovies(query: String!): [Movie]
}

type Mutation {
  addToWatchlist(movieId: ID!): Movie
  removeFromWatchlist(movieId: ID!): Boolean
  updateUserSettings(country: String, platforms: [String]): User
}

type Subscription {
  movieAddedToStreaming(userId: ID!): Movie
}
```

---

## Roadmapa

**V1 — Web App (4-6 tygodni vibe-coding):**
- Rejestracja / logowanie
- Wybór kraju i platform
- Watchlista filmów
- Powiadomienia email gdy film pojawia się na streamingu
- Stripe $5/mc

**V2 — Web Push + PWA (1-2 tygodnie):**
- Powiadomienia push w przeglądarce bez appki
- Instalacja jako PWA na Android/iOS

**V3 — Native Mobile App (3-4 tygodnie):**
- React Native + Expo
- Jeden codebase na iOS i Android
- Push notifications natywne
- Publikacja na App Store i Google Play

---

## AI Vibe-coding — jak to działa

Zamiast pisać kod od zera, używasz AI jako asystenta który generuje kod za Ciebie. Opisujesz co chcesz zbudować w języku naturalnym — AI pisze kod, wyjaśnia co zrobiło i proponuje kolejne kroki.

**Narzędzia:**
- **Cursor** — edytor kodu z wbudowanym AI. Otwierasz projekt, opisujesz feature po polsku lub angielsku, Cursor generuje kod. Koszt: ~$20/miesiąc.
- **Claude Code** — terminal AI agent który samodzielnie pisze, testuje i naprawia kod. Bardziej autonomiczny niż Cursor.

**Jak zacząć:**
1. Zainstaluj Cursor
2. Utwórz nowy projekt Next.js: `npx create-next-app@latest stream-alert --typescript`
3. Powiedz Cursorowi: *"Zbuduj mi stronę logowania z Google OAuth używając Supabase Auth"*
4. Cursor wygeneruje kod, wyjaśni co zrobił
5. Uruchom, sprawdź, powiedz co poprawić
6. Powtarzaj dla każdego kolejnego feature

**Ważne:** AI popełnia błędy — szczególnie przy integracji wielu serwisów naraz. Buduj feature po feature, testuj każdy krok. Cierpliwość jest kluczem.

**Realny timeline:** tydzień intensywnej pracy = działający MVP z podstawowymi funkcjami. Bez AI vibe-codingu to samo zajęłoby 2-3 miesiące.

---

*Opracowane przez Homo Digital dla Teodora Kuleja*
*homodigital.io*
