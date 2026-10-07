# 09. The "Ownership note" chapter: decisions, risks, what you'd do differently

This chapter shows that you **own** the solution: you understand the decisions, know the weak spots and know what to do before production. In the interview it is a frequent source of "what if…" questions.

---

## Part 1: Main decisions

### Decision 1: semantics in one place on each side
**What:** the client computes the difference (`computeSavedSearchEdits`) and sends only the changed keys. The server validates the whole request before changing anything. Absent key = no change, `null` = clear, value = set.
**In plain words:** each side has one place that "knows" what the data means. There are no competing interpretations.

### Decision 2: `expectedVersion` is required
**What:** missing version → 400.
**In plain words:** if a safeguard can be bypassed by not sending a field, it is not a safeguard.

### Decision 3: atomic "check and write" in the store
**What:** version comparison and write in one synchronous function, with no `await`.
**In plain words:** Node runs JS on one thread. A function with no `await` cannot be interrupted by another request, so nobody can squeeze in between the check and the write.

### Decision 4: 409 is never retried automatically
**What:** on conflict, a message and a Reload button. No "take the new version and send again".
**In plain words:** auto-retry means making a decision for the user based on data they have not seen. It overwrites the other person's change - exactly what versions are meant to prevent.

### Decision 5: logic outside the JSX
**What:** `submitSavedSearchEdit` holds the whole save decision, the component only displays the result.
**In plain words:** JSX can't be tested without a bundler, so what matters lives in plain JS. As a bonus, it is a better split of responsibilities.

### Decision 6: defense in depth for `priceMax`
**What:** three layers reject a bad price: the form parser, the serializer, the API.
**In plain words:** `JSON.stringify` turns `NaN` into `null`, i.e. into "delete". The server can't tell the difference, so the client has to stop it earlier, and in more than one place.

### Decision 7: `FILTER_KEYS` separately in the API and the client
**What:** two definitions of the key list instead of one shared one.
**In plain words:** the server is the trust boundary and should not depend on client code. The cost: adding a filter means changing both places (plus the list in the JSX). A deliberate trade-off.

---

## Part 2: Validation approach (one sentence)

Tests at every layer, strict assertions, the required cross-boundary test on both versions of the code, and mutation tests proving the important tests can fail. Details in file 07.

---

## Part 3: Residual risks (what is left and what to do before production)

**Residual risk** is the risk that remains after the fix. Showing that you know them is a sign of maturity.

### 1. Atomicity works only within one process
Today the data lives in the memory of a single Node process. With a real database the check must be a **conditional write in the database**:
```sql
UPDATE saved_searches
SET filters = ?, version = version + 1
WHERE id = ? AND version = ?;
-- then: if 0 rows changed -> 409
```
With several server instances there is no other safe way. You cannot do "check in the application, then write", because another instance can write between the two queries.

### 2. The JSX itself is not executed in tests
The logic is extracted and tested, but the wiring of `kind` → UI message is not. Before production: a component test (React Testing Library) and one browser end-to-end test (e.g. Playwright).

### 3. `if (saving) return` reads state from a closure
**Closure:** the `onSave` function "remembers" the value of `saving` from the last render. Two clicks within a single frame could both see `false`. In practice the disabled button (`disabled`) protects against it. The full solution: `useRef`, whose value changes immediately, without waiting for a render.

### 4. Reload after a 409 throws away what the user typed
Better UX: show their unsaved change next to the current server state, so they can consciously reapply it. The server already returns the current state in the 409 body, so this is a UI-only change.

### 5. Dates validated only as text
No format check and no `dateFrom <= dateTo` condition. Note: the second condition has to be checked on the **merged state**, because a patch may contain only one date.

### 6. `priceMax` precision difference
The server accepts `499.999`, the client requires at most 2 decimal places. Deliberately: the server protects data integrity, the client enforces the human-entered format. If other clients had to respect it, the rule would have to move to the server.

### 7. An empty `filters: {}` bumps the version
The API accepts it. Our client never sends it, but another client could needlessly invalidate the version for others. Option: treat an empty patch as a no-op without a version change (needs a decision, because it changes the contract).

---

## Part 4: What you would do differently

> I would start by writing the regression test against `reference_defect.js` **before** any fix, and from the outset treat `verify` as necessary but not sufficient. `verify` showed 3/3 after the serializer fix alone, while the real editor was still sending the whole form.

**In plain words:** "test first". If you had first written a test describing the correct behaviour and seen it fail on the original, you would have had an objective measure of progress from the start and would not have been misled by the green gate.

---

## Questions you may be asked

**"What is the weakest point of your solution?"**
> "No test of the React component itself. The logic is tested, but the wiring into the UI isn't. The second point is atomicity only within a single process, but that comes from the in-memory store that was in the starter."

**"How would you move this to a real database?"**
> "A conditional UPDATE with `WHERE version = ?` and a check of the number of affected rows. Zero means 409. An alternative is a transaction with a row lock (`SELECT ... FOR UPDATE`), but the conditional UPDATE is simpler and does not hold a lock."

**"Why not ETag and If-Match?"**
> "That is the standard HTTP mechanism for optimistic concurrency and would be a good direction. But the contract and `verify` (which must not be changed) pass the version in the body as `expectedVersion`, so I stuck to the contract. I could support both."

**"What if two people change different fields? Isn't 409 too strict?"**
> "Good question. Since we send only the changed fields, the server could technically merge non-conflicting changes. But the contract says explicitly: a mismatched version means 409 and nothing is applied. Merging is a product decision: does user B want to save their change without having seen A's change? For search filters probably yes, for financial data probably not. The incident has a 'finance-style expectation', so I stayed with a cautious 409."
