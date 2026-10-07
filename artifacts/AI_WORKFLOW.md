# AI Workflow Log

## Tools used

- **Claude Code** (CLI, in the repo): read the codebase, implemented every change, ran `npm test` / `npm run verify`, made the commits.
- **Claude (claude.ai chat, separate session)**: acted as a second reviewer. I pasted Claude Code's plans, diffs and outputs into it; it reviewed them, designed the next prompt, and independently re-ran mutation tests on a reconstruction of the code.
- **Me**: decided scope and order of work, approved or rejected each step before commit, read the generated test files myself, pushed the history.

The working rule was: one plan step per prompt, one commit per step, no commit before review, and "show me the artifact, not a summary of it".

## What I asked, and what I got

1. **Diagnosis only, no code changes.** Claude Code correctly located the three defects: the client serializer (`form[key] ?? null` turns every absent key into an explicit clear), the editor sending the whole form with no `expectedVersion`, and the API/store having no version check. It also correctly rejected `docs/ai-recommendation.md` (type agreement is not agreement on absent-vs-null semantics, and it does nothing for concurrency).
2. **Revised plan** after my corrections (see next section).
3. **Implementation, one commit per step:** API validation; optimistic concurrency in the store; serializer fix; strict assertions; `computeSavedSearchEdits`; `submitSavedSearchEdit` + editor; cross-boundary regression check; contract docs; serializer hardening.

The full transcript is in docs/ai-session-transcript.md.

## Where I intervened, edited, or rejected the AI's output

- **Plan, step 1.** Claude Code's first plan treated `body.filters || body` as "missing validation". It is a bug: `{ expectedVersion: 3 }` without `filters` would be stored as a filter named `expectedVersion`. Fallback removed, covered by a test asserting the key does not leak into filters.
- **Plan, step 1.** The plan did not decide whether `expectedVersion` is required. If optional, any client that omits it bypasses concurrency control. Made required (400).
- **Plan, step 1.** The plan would have broken `test/given.test.js` (it PATCHes without a version) and, later, left the editor calling an old `saveEdit` signature for two commits. Reordered and merged commits so every commit is green.
- **Plan, step 1.** Fixing only the serializer turns `verify` 3/3 while the real UI still sends the whole form. Required the "form -> edits" diff to be extracted from JSX into a pure, testable module.
- **Stale-version test.** Claude Code tested `expectedVersion = version - 1 = 0`, a version that never existed. Replaced with the real incident scenario (A and B read v1, A saves, B saves with v1 -> 409, B's change not applied).
- **Legacy `assert`.** All tests used `require('node:assert')`, where `deepEqual({ priceMax: undefined }, { priceMax: null })` passes and `equal(500, '500')` passes. That makes null-vs-absent assertions meaningless in exactly the area this task is about. Switched to `node:assert/strict` in its own commit.
- **priceMax parser.** Probing the generated parser with edge inputs showed `Number()` silently accepting `"0x1F4"` (500), `"0b111110100"` (500), `"1e3"` (1000) and `"-50"`. Replaced with an explicit non-negative decimal pattern; server rejects negatives.
- **Editor async issues.** A double-click produced a false 409 about the user's own save, and a 200 could overwrite text typed mid-save. Added a `saving` state that disables all controls. Load/reload errors no longer leave the UI stuck on "Loading...".
- **Contract doc.** The AI-written contract claimed `NaN`/`Infinity` -> 400. Impossible over JSON: `JSON.stringify({ priceMax: NaN })` is `{"priceMax":null}`, which the server correctly treats as a clear (200). Fixed the doc and added a guard in `buildSavedSearchPatch` so non-finite values throw before serialization.
- **Summaries instead of artifacts.** Several times Claude Code reported "here are the full contents" or "confirmed, the test fails" while the terminal only showed a collapsed tool call. I opened the files myself instead of trusting the summary, and from then on every prompt required raw output and full file contents.

## The moment the AI was wrong (or would have masked the symptom, not the defect)

**A test that could not fail.** Claude Code wrote `test/client-flow.test.js` with a case named "invalid priceMax 'abc' sends no request and leaves the server unchanged". It called `computeSavedSearchEdits`, checked that an error was reported, then asserted the server version and filters were unchanged. It never called anything that could send a request, so the server was trivially unchanged. A comment claimed "onSave's contract: a non-empty errors object means saveEdit is never called" - describing JSX the test never executed. Deleting the guard from the editor would have left the test green. This is the same failure mode as INC-702 itself: green tests that do not check what their name promises.

**How it was identified:** reading the test body against its name during review, rather than accepting the passing result.

**Root cause and fix:** the save decision lived in JSX, which cannot run without a bundler. I had it extracted into `src/client/submitSavedSearchEdit.js` (returns `invalid | unchanged | saved | conflict | error`); the editor now only maps `kind` to UI. The test now calls the real decision code with `priceMax: "abc"` **plus a valid `dateTo` edit**, so if the guard were removed the `dateTo` change would be sent and the test would fail.

**How the correction was validated:** mutation testing. Claude Code reported that the test failed with the guard removed but did not show the output, so the mutations were re-run independently on a reconstruction of the code:

| Mutation                                      | Result                 |
| --------------------------------------------- | ---------------------- |
| errors guard removed                          | `invalid blocks` fails |
| empty-diff guard removed                      | `unchanged` fails      |
| diff sends every string field                 | `unchanged` fails      |
| silent auto-retry on 409 with the new version | 409 scenario fails     |

A related near-miss worth noting: the NaN -> `null` -> silent delete path appeared twice - once in the first version of the client plan (`Number("abc")` would have been sent as `null`, deleting the price cap) and once in the contract doc. It is the same class of bug as the incident.

## How I validated correctness

### Before

```
$ npm test
given tests

  ok      GET returns the seeded saved search
  ok      a full-form save updates a field

2 passing, 0 failing
```

```
$ npm run verify
ACCEPTANCE CRITERIA (drives the real client/API boundary)

   FAIL   B1  one-field edit preserves untouched filters   untouched "query" was removed; untouched "category" was removed; untouched "dateFrom" was removed; untouched "priceMax" was removed
   FAIL   B2  explicit clear removes only that filter      clearing priceMax also removed "query"; clearing priceMax also removed "category"; clearing priceMax also removed "dateFrom"; clearing priceMax also removed "dateTo"
   FAIL   B3  concurrent edits do not lose an update (409) expected one 200 and one 409, got 200 and 200 (lost update: last write silently wins); version went 1 -> 3, expected exactly one increment

RESULT: 0 / 3 criteria passing - the update contract is not safe
```

### After

```
$ npm test

> saved-search-fullstack-starter@1.0.0 test
> node test/given.test.js && node test/api-validation.test.js && node test/api-concurrency.test.js && node test/client-serializer.test.js && node test/client-edits.test.js && node test/client-flow.test.js && node test/run-regression.js


given tests

  ok     GET returns the seeded saved search
  ok     a full-form save updates a field

2 passing, 0 failing


api validation tests

  ok     missing expectedVersion -> 400, nothing changes
  ok     non-integer expectedVersion -> 400, nothing changes
  ok     filters absent -> 400, does not fall back to treating the body as the patch
  ok     unknown filter key -> 400, nothing changes
  ok     priceMax as a numeric string -> 400, nothing changes
  ok     priceMax -50 -> 400, nothing changes
  ok     filters as an array -> 400, nothing changes

7 passing, 0 failing


api concurrency tests

  ok     stale expectedVersion -> 409, the earlier write is not lost
  ok     matching expectedVersion -> 200, version advances by exactly 1
  ok     two concurrent edits at the same version: one 200, one 409, single version bump
  ok     unknown id -> 404

4 passing, 0 failing


client serializer tests

  ok     single-key edit emits only that key
  ok     explicit null is preserved (clear)
  ok     undefined is omitted, not sent as null
  ok     empty edits -> {}
  ok     unknown key throws
  ok     priceMax NaN throws (JSON.stringify would silently turn it into null)
  ok     priceMax Infinity throws
  ok     priceMax -1 throws
  ok     priceMax 0 -> { priceMax: 0 }
  ok     result never contains keys absent from the input

10 passing, 0 failing


client edits tests

  ok     untouched form -> {} with no errors
  ok     only dateTo changed -> { dateTo }
  ok     priceMax "450" -> 450 (number)
  ok     priceMax "500" when original is 500 -> no edit (500 vs "500" is not a change)
  ok     priceMax "499.99" -> 499.99
  ok     priceMax "0x1F4" -> error, no priceMax edit
  ok     priceMax "1e3" -> error, no priceMax edit
  ok     priceMax "-50" -> error, no priceMax edit
  ok     priceMax "12abc" -> error, no priceMax edit
  ok     priceMax "abc" -> error, priceMax absent from edits
  ok     priceMax "   " when original is 500 -> null (explicit clear)
  ok     priceMax "" when original absent -> no edit
  ok     null in form for a previously cleared (absent) key -> no edit
  ok     an error on priceMax does not drop other valid edits
  ok     clearing a string filter (empty string) when original has a value -> null
  ok     a key absent from the form entirely is treated as empty, same as present-and-empty

16 passing, 0 failing


client flow tests

  ok     editing only dateTo through the full form preserves all other filters
  ok     typing "" into priceMax clears only priceMax
  ok     untouched form -> unchanged, no request sent
  ok     invalid priceMax blocks the whole save, including an otherwise-valid dateTo edit
  ok     two editors at the same version: the later save gets 409, the earlier survives

5 passing, 0 failing


against src/ (expected: check() === true)

   PASS   one-field edit preserves untouched filters - ok
   PASS   explicit clear removes only that filter - ok
   PASS   stale expectedVersion is rejected (no lost update) - ok

against test/reference_defect.js (expected: check() === false)

   FAIL   one-field edit preserves untouched filters - "query" was not preserved; "category" was not preserved; "dateFrom" was not preserved; "priceMax" was not preserved
   FAIL   explicit clear removes only that filter - "query" was not preserved; "category" was not preserved; "dateFrom" was not preserved; "dateTo" was not preserved
   FAIL   stale expectedVersion is rejected (no lost update) - B's stale save was not rejected (status 200, expected 409); category is "undefined", expected "Books"; priceMax is 300, expected 500 (B's write must not apply); version is 3, expected 2

regression gate

   ok     check(src) === true
   ok     check(reference_defect) === false
```

```
$ npm run verify
   PASS   B1  one-field edit preserves untouched filters   one-field edit preserved the other four filters
   PASS   B2  explicit clear removes only that filter      clearing priceMax removed only priceMax
   PASS   B3  concurrent edits do not lose an update (409) concurrent edits: one accepted (200), one rejected (409), single version bump

RESULT: 3 / 3 criteria passing - all clear
```

### What `test/regression.test.js` asserts

Using only the injected `createApp` and `buildSavedSearchPatch` (so the identical scenarios run against `src/` and against `test/reference_defect.js`), over real HTTP with a fresh app per scenario:

1. a one-field edit (`{ dateTo }`) through the client serializer leaves the other four filters present with their original values;
2. an explicit clear (`{ priceMax: null }`) removes only `priceMax`;
3. the sequential lost-update scenario from the incident: B's save with a stale version gets 409, A's change survives, B's change is not applied, version advances exactly once.

It would have caught the original defect: on the reference code all three scenarios fail, each for the right reason (shown above). It also rejects **partial** fixes, which is the kind of fix an AI tends to propose:

| Partial fix                                                      | `check()`           |
| ---------------------------------------------------------------- | ------------------- |
| serializer fixed, no version check                               | false (lost update) |
| version check, old serializer                                    | false (all three)   |
| store treats `null` as "no change"                               | false (clear)       |
| store accepts `expectedVersion <= version`                       | false (lost update) |
| serializer drops nulls (the classic "just filter out nulls" fix) | false (clear)       |

`test/run-regression.js` runs both targets and is part of `npm test`, so the check cannot silently stop running.

## What I deliberately did NOT use AI for, and why

- The decision to accept or reject each step. Every commit was reviewed before it was made.
- Reading the generated test files. When Claude Code summarized a file instead of showing it, I opened it myself.
- Git: pushing, keeping the history unsquashed, keeping my own `AI_WORKFLOW.md` notes in separate commits.
- Scope decisions: not adding a bundler or a browser test runner, even though it would have allowed testing the JSX directly (the brief forbids a build tool).

## Ownership note

**Main decisions.**

- _Semantics live in one place per side._ The client computes a diff against the last-loaded filters (`computeSavedSearchEdits`) and serializes only those keys; the server validates the whole patch before applying anything. Absent = unchanged, `null` = clear, value = set.
- _`expectedVersion` is required._ Optional concurrency control is no concurrency control.
- _Atomic check-and-set inside the store,_ in one synchronous call with no `await`, so it cannot interleave on Node's event loop.
- _409 is never auto-retried._ Retrying with the new version would silently reapply a decision made against stale data - the exact lost update the version exists to prevent. The user sees the conflict and reloads.
- _Decision logic out of JSX_ (`submitSavedSearchEdit`), so the real save path is testable without a build tool.
- _Defense in depth for `priceMax`_: the client form parser, the serializer and the API each reject invalid values, because `JSON.stringify` turns `NaN` into `null`, i.e. into a delete.
- `FILTER_KEYS` is deliberately defined separately in the API and the client: the server is the trust boundary and should not import client code.

**Validation approach.** Tests at each layer (API validation, API concurrency, serializer, form diff, full client flow over HTTP), strict assertions, the required cross-boundary check run against both the fix and the frozen reference, and mutation testing to prove the important tests can fail.

**Residual risk / before production.**

- Atomicity relies on a single-process, synchronous in-memory store. With a real database the check must be a conditional write (`UPDATE ... WHERE id = ? AND version = ?`, then check affected rows), and with multiple instances there is no other safe option.
- The JSX itself is not executed by any test (no bundler, per the brief). Its logic is extracted and tested; the wiring of `kind` to UI state is not. Before production I would add a component test (e.g. React Testing Library) and one browser end-to-end test.
- `if (saving) return` reads state from a closure; two clicks within one render frame could in theory both pass. The disabled button covers this in practice; a `useRef` guard would close it fully.
- On 409, reloading discards the user's typed edits. A better UX would show their pending edit next to the new server state so they can reapply it.
- Dates are validated as strings only (no format check, no `dateFrom <= dateTo`). The server accepts more than two decimals for `priceMax`, while the client form does not.
- An empty `filters` object is accepted by the API and bumps the version; the client never sends one, but other clients could.

**What I would do differently.** Start by writing the cross-boundary regression check against `reference_defect.js` first, before any fix, and treat `verify` as necessary but not sufficient from the outset: it went 3/3 after the serializer fix alone, while the real editor was still sending the whole form.
