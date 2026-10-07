# 07. The "How I validated correctness" chapter

## What this chapter of AI_WORKFLOW.md contains

1. **Before:** the output of `npm test` (2/2 green) and `npm run verify` (0/3) at the start.
2. **After:** the full output of `npm test` (every test file + the regression gate) and `npm run verify` (3/3).
3. **What `test/regression.test.js` checks** and why it would detect the original bug.
4. **A table of partial fixes** the test rejects.

---

## 1. Before and After: how to read it

### Before
- `npm test`: **2 passing**. Green, but misleading. The second test sends the full form, so it cannot see the bug.
- `npm run verify`: **0/3**:
  - B1 FAIL: "untouched query was removed; ..." (changing the date wiped 4 filters),
  - B2 FAIL: "clearing priceMax also removed query ..." (clearing the price wiped the rest),
  - B3 FAIL: "got 200 and 200 (lost update) ... version went 1 -> 3".

**Interview lesson:** green tests at the start alongside a red gate prove that "the tests pass" means nothing if you don't know what they check.

### After
- `npm test`: 44 tests in six files + the regression gate,
- `npm run verify`: **3/3**, "all clear".

## 2. The test pyramid we built

```
                  ┌─────────────────────────────┐
                  │ regression.test.js (3)      │  ← src vs reference_defect
                  │ verify.js (3, from Toptal)  │
                  ├─────────────────────────────┤
                  │ client-flow.test.js (5)     │  ← the whole client flow over HTTP
                  ├─────────────────────────────┤
                  │ api-validation (7)          │
                  │ api-concurrency (4)         │  ← the API over HTTP
                  │ given.test.js (2)           │
                  ├─────────────────────────────┤
                  │ client-serializer (10)      │
                  │ client-edits (16)           │  ← pure functions, no network
                  └─────────────────────────────┘
```

| File | What it checks | Example |
|---|---|---|
| `given.test.js` | supplied tests (updated with the version) | GET returns the search |
| `api-validation.test.js` | 400 on bad data + **no change** | no `filters` → 400, `expectedVersion` does not leak |
| `api-concurrency.test.js` | 409 and no lost update | A saves, B with a stale version → 409 |
| `client-serializer.test.js` | the serializer | `{ priceMax: NaN }` → exception |
| `client-edits.test.js` | the form diff | `"0x1F4"` → error, not 500 |
| `client-flow.test.js` | the real save decision over HTTP | bad price + good date → nothing sent |
| `regression.test.js` | the required cross-boundary test | see below |

All of them use `node:assert/strict` and are wired into `npm test`, so none of them can silently stop running.

## 3. The regression test: what it checks

`check({ createApp, buildSavedSearchPatch })` receives two functions **from outside**. It uses only them and `fetch`. That lets us run the same test:
- on **your code** (`src/app.js` + `src/client/buildSavedSearchPatch.js`) → must pass,
- on the **frozen original** (`test/reference_defect.js`) → must fail.

Each scenario gets a **fresh server** on a random port (so scenarios don't interfere).

### Three scenarios

**1. Editing one field.** `buildSavedSearchPatch({ dateTo: '2026-06-20' })` with the current version. Checks that `dateTo` changed and the other 4 filters **exist and have their original values**.

**2. Explicit clear.** `buildSavedSearchPatch({ priceMax: null })`. Checks that only `priceMax` disappeared and the other 4 are untouched.

**3. Lost update, sequentially.** A and B read the same version. A saves `category: Books` → 200. B saves `priceMax: 300` with the stale version → **must be 409**. End state: category Books, price **500** (B's change did not go in), version +1.

### Result on the original (each scenario fails for the right reason)

```
FAIL one-field edit ... - "query" was not preserved; "category" ...; "dateFrom" ...; "priceMax" ...
FAIL explicit clear ... - "query" was not preserved; ...
FAIL stale expectedVersion ... - B's stale save was not rejected (status 200, expected 409); ...
```

"For the right reason" matters. A test that fails on the original **because of an exception in the test itself** would also return `false`, but would prove nothing. `runScenarios` returns per-scenario details precisely so the reason is visible.

### Why it would detect the original bug
Because it **reproduces exactly the incident scenarios** (date change, price clear, two editors) through the **real serializer** and **real HTTP**, without mocks. The brief requires: "Drive the real client serializer against the real API - a helper tested in isolation does not count".

## 4. The partial-fixes table (the strongest argument)

Failing on the original is the minimum. Stronger proof: the test **rejects every fix that solves only part of the problem**. Verified with mutations:

| Partial fix | `check()` | Which scenario catches it |
|---|---|---|
| serializer fixed, no version check | false | 3 (lost update) |
| version check, old serializer | false | all 3 |
| store treats `null` as "no change" | false | 2 (clear) |
| store accepts `expectedVersion <= version` | false | 3 |
| serializer drops nulls (the "classic AI fix") | false | 2 |

The last row is the most important. "Just filter out the nulls" is a typical quick AI suggestion. It fixes B1 but breaks B2, because nothing can be cleared any more. The test catches it.

## 5. `run-regression.js`: the gate inside `npm test`

It runs `runScenarios` on both versions, prints the result per scenario and exits with an error if:
- `check(src)` is not `true`, or
- `check(reference_defect)` is not `false`.

It is part of `npm test`. If someone broke the test so it always passes, the second condition fails. If someone broke the code, the first one fails.

---

## How to tell it in the interview

> "At the start `npm test` was green and `verify` was 0/3. That's the best proof that green tests mean nothing without knowing what they check. I built tests at every layer, from pure functions to the full flow over HTTP. I run the regression test on my code and on the frozen original, and show that on the original every scenario fails for the right reason. I also checked with mutations that the test rejects partial fixes, including the classic AI suggestion 'filter out the nulls'."

## Questions you may be asked

**"Why doesn't the regression test test the editor?"**
> "The `check()` signature takes only `createApp` and `buildSavedSearchPatch`, because that is all `reference_defect.js` exports. The editor and the diff are tested by `client-flow.test.js` over real HTTP. The regression guards the contract at the boundary, client-flow guards the user's flow."

**"On the original, scenario 3 fails for two reasons at once. Isn't that a problem?"**
> "On the original, filter loss and the lost update overlap. But the decisive assertion is `b.status !== 409`. The mutation 'serializer fixed, no version' shows scenario 3 also works in isolation."

**"Why does B3 in verify use `Promise.all`, and you a sequence?"**
> "`Promise.all` checks real parallelism, but the ordering depends on the event loop. A sequence is deterministic and reproduces the incident exactly: A has saved, B holds a stale version. In `api-concurrency.test.js` I have both."

**"How did you check that the tests catch anything at all?"**
> "With mutations. I broke the code in specific places - removed guards, disabled the version check, added auto-retry - and checked that the right test fails."
