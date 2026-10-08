# Interview script: 40-minute walkthrough

Read top to bottom. Each block: **Open** (file and lines), **Show** (the code on screen), **Say** (what to tell the reviewer). Line numbers refer to the submitted repo.

## Before the call (2 minutes of setup)

Open a terminal in the repo and have these ready:

```bash
git log --oneline                                          # the story of the work
git show dc3f22e:src/client/buildSavedSearchPatch.js       # original serializer
git diff dc3f22e -- src/                                   # every source change
npm test
npm run verify
```

Open in the editor, as tabs, in this order: `docs/incident.md`, `docs/api-contract.md`, `src/app.js`, `src/server/savedSearchStore.js`, `src/client/computeSavedSearchEdits.js`, `src/client/submitSavedSearchEdit.js`, `src/client/buildSavedSearchPatch.js`, `test/regression.test.js`, `test/client-flow.test.js`, `AI_WORKFLOW.md`.

## Plan

| Min | Topic | Main files |
|---|---|---|
| 0-3 | Business problem | `docs/incident.md` |
| 3-8 | The contract | `docs/api-contract.md` |
| 8-15 | Three causes in the original code | `git show dc3f22e:...` |
| 15-25 | The fix, layer by layer | `app.js`, `savedSearchStore.js`, `computeSavedSearchEdits.js`, `submitSavedSearchEdit.js`, `buildSavedSearchPatch.js`, `SavedSearchEditor.jsx` |
| 25-32 | Proof | terminal, `regression.test.js`, `client-flow.test.js` |
| 32-38 | AI workflow | `AI_WORKFLOW.md` |
| 38-40 | Residual risks | `AI_WORKFLOW.md` ownership note |

---

## 0-3 min: The business problem

**Open:** `docs/incident.md`

**Say:**
> "There are two reports. INC-702: a user edits one filter of a saved search, for example the end date, saves, and the other filters disappear. The second, quieter report: two teammates edit the same saved search, and one person's change disappears without any error.
>
> The requirement fits in one sentence from the incident: an edit changes what the user changed and nothing else. And a concurrent edit must be rejected with 409, never silently overwritten.
>
> Also worth noting: the incident says the existing tests are green. That turned out to be the theme of the whole task - green tests that don't check what they claim."

---

## 3-8 min: The contract

**Open:** `docs/api-contract.md` - the three-case table at the top.

**Show:**

| In the patch | Meaning |
|---|---|
| key with a value | set that filter |
| key with `null` | clear only that filter |
| key absent | leave it unchanged |

**Say:**
> "This table is the whole task. An absent key and `null` are two different instructions. Absent means 'I'm not touching this'. `null` means 'delete this'. Every bug I found is a place where those two got mixed up.
>
> The second part is concurrency: the client sends `expectedVersion`, the version it last read. If the stored version is different, the server returns 409 and applies nothing."

**Open:** `docs/api-contract.md` line 33 (`## Request validation`) and line 68 (`## Client responsibilities`).

**Say:**
> "I extended the contract with what was implicit: the version is required, unknown keys are rejected, the 409 body carries the current state, and the client never auto-retries a 409."

---

## 8-15 min: The three causes in the original code

### Cause 1: the serializer turns "absent" into "delete"

**Run:** `git show dc3f22e:src/client/buildSavedSearchPatch.js`

**Show** (original line 16):
```js
for (const key of FILTER_KEYS) {
  patch[key] = form[key] ?? null;
}
```

**Say:**
> "It always loops over all five keys, and `?? null` turns every missing key into `null`. So `buildSavedSearchPatch({ dateTo: '2026-06-20' })` produces `null` for the other four keys - which the contract defines as 'delete'. One date edit wipes four filters. That's INC-702."

### Cause 2: the editor sends the whole form, with no version

**Run:** `git show dc3f22e:src/client/SavedSearchEditor.jsx` (line 31) and `git show dc3f22e:src/client/apiClient.js` (line 26)

**Show:**
```js
// SavedSearchEditor.jsx, line 31
const { status: code, body } = await saveEdit(baseUrl, id, form);

// apiClient.js, line 26
body: JSON.stringify(patch),        // filters only, no expectedVersion
```

**Say:**
> "The editor passes the entire form snapshot. That resends old values of fields the user never touched - so if a colleague changed the category in the meantime, this save quietly reverts it. That's a lost update. And there's no version in the request at all, so the server has nothing to check."

### Cause 3: the server checks nothing

**Run:** `git show dc3f22e:src/app.js` (line 47)

**Show:**
```js
// As shipped: the whole body is treated as the filter patch. No version
// check, no validation of keys or values.
const search = store.patch(match[1], body.filters || body);
```

**Say:**
> "No version check, no validation. And the `body.filters || body` fallback is an active bug: a request `{ expectedVersion: 3 }` without filters would store a filter literally named `expectedVersion`.
>
> One thing I want to point out: the store's merge logic in `savedSearchStore.js` was correct from the start - `null` deletes, a value sets, absent is skipped. The B1 and B2 bug was in what reached the store, not in the store. That's why 'make the store ignore nulls' would have been the wrong fix."

---

## 15-25 min: The fix, layer by layer

**Say first:**
> "I fixed the server first, because it is the trust boundary. It has to be safe regardless of which client talks to it. Then the client."

### Server: validation (`src/app.js`)

**Open:** `src/app.js` lines 17-45 (`FILTER_KEYS`, `isPlainObject`, `validatePatchBody`)

**Show** (line 27):
```js
if (!Number.isInteger(body.expectedVersion)) return 'expectedVersion is required and must be an integer';
```

**Say:**
> "The version is required. If it were optional, any client that omits it would bypass concurrency control, and B3 would only be fixed for the test. `filters` is required too, which replaces the fallback. Only the five known keys are allowed, with types checked, and the whole patch is validated before anything is applied - no partial writes."

**Open:** `src/app.js` lines 71-77

**Show:**
```js
const validationError = validatePatchBody(body);
if (validationError) return sendJson(response, 400, { error: validationError });
const result = store.patch(match[1], body.expectedVersion, body.filters);
if (result.ok) return sendJson(response, 200, result.search);
if (result.reason === 'conflict') {
  return sendJson(response, 409, { error: 'version_conflict', search: result.search });
}
```

**Say:**
> "Order of checks: bad JSON 400, validation 400, unknown id 404, stale version 409, success 200. The 409 body includes the current state so the client can show it."

### Server: atomic check-and-set (`src/server/savedSearchStore.js`)

**Open:** lines 50-63

**Show:**
```js
patch(id, expectedVersion, filters) {
  if (id !== search.id) return { ok: false, reason: 'not_found' };
  if (expectedVersion !== search.version) {
    return { ok: false, reason: 'conflict', search: structuredClone(search) };
  }
  // ... merge unchanged ...
  search = { ...search, filters: nextFilters, version: search.version + 1 };
```

**Say:**
> "The version check and the write happen in one synchronous function with no `await` between them. Node runs JavaScript on a single thread, so no other request can interleave between the check and the write - that makes it atomic. If there were an `await` in between, two requests could both pass the check. With a real database this becomes a conditional `UPDATE ... WHERE version = ?`."

### Client: the diff (`src/client/computeSavedSearchEdits.js`)

**Open:** lines 31-62

**Show** (lines 55-59):
```js
if (formEmpty) {
  if (!originalEmpty) edits[key] = null;   // had a value, now empty = clear
  continue;                                // empty and empty = no change
}
if (originalEmpty || formValue !== originalValue) edits[key] = formValue;
```

**Say:**
> "The client now compares the form against the filters it last loaded and sends only what actually changed. Empty and absent are treated the same, so a cleared filter doesn't produce a pointless `null` on every save."

**Show** (line 23):
```js
const PRICE_MAX_PATTERN = /^\d+(\.\d{1,2})?$/;
```

**Say:**
> "For the price, `Number()` was too permissive: `'0x1F4'` becomes 500, `'1e3'` becomes 1000, and `'   '` becomes 0. So it's an explicit whitelist, and emptiness is checked before parsing. Invalid input goes into `errors`, never into `edits`."

### Client: the save decision (`src/client/submitSavedSearchEdit.js`)

**Open:** lines 19-29

**Show:**
```js
if (Object.keys(errors).length > 0) return { kind: 'invalid', errors };
if (Object.keys(edits).length === 0) return { kind: 'unchanged' };
const { status, body } = await saveEdit(baseUrl, id, search.version, edits);
if (status === 200) return { kind: 'saved', search: body };
if (status === 409) return { kind: 'conflict', search: body && body.search };
```

**Say:**
> "This is the whole Save button logic, moved out of the JSX. JSX can't run in Node without a bundler, and the brief forbids adding one, so this is how the real decision code becomes testable. Two guards: invalid input sends nothing, and an empty diff sends nothing - because the API would accept an empty patch and bump the version for no reason. On 409 there is no auto-retry. Retrying with the new version would overwrite the other person's change with a decision made on stale data - exactly the lost update we're preventing."

### Client: the serializer (`src/client/buildSavedSearchPatch.js`)

**Open:** lines 24-35

**Show:**
```js
function buildSavedSearchPatch(edits) {
  for (const key of Object.keys(edits)) {          // only the keys provided
    if (!FILTER_KEYS.includes(key)) throw new Error(`unknown filter key "${key}"`);
    if (value === undefined) continue;
    if (key === 'priceMax' && value !== null && !(Number.isFinite(value) && value >= 0)) {
      throw new Error('priceMax must be a finite number >= 0, or null');
    }
```

**Say:**
> "The parameter was renamed from `form` to `edits` - that one rename describes the fix. It loops over the input's keys, so absent stays absent and `null` stays `null`.
>
> The `priceMax` guard is defense in depth: `JSON.stringify({ priceMax: NaN })` produces `{"priceMax":null}`. A typo would silently become 'delete the price cap', and the server can't tell, because it receives a valid `null`. So the client blocks it in two places."

### Client: the editor (`src/client/SavedSearchEditor.jsx`)

**Open:** lines 46-49 and 82-88

**Say:**
> "The component now only maps `kind` to a message. A `saving` flag disables every control during a save - otherwise a double click sends two requests with the same version and the user gets a 409 about their own save. Load errors are handled, so it doesn't hang on 'Loading…'."

---

## 25-32 min: Proof

**Run:** `npm run verify`

**Say:**
> "At the start this was 0 of 3 while `npm test` was green. Now it's 3 of 3."

**Run:** `npm test` and scroll to the regression section.

**Show:**
```
against src/ (expected: check() === true)
   PASS   one-field edit preserves untouched filters - ok
   ...
against test/reference_defect.js (expected: check() === false)
   FAIL   one-field edit ... - "query" was not preserved; ...
   FAIL   stale expectedVersion ... - B's stale save was not rejected (status 200, expected 409); ...
```

**Say:**
> "The required regression check runs against my code and against the frozen original. It passes on mine and fails on the original - and each scenario fails for the right reason, not because the test threw. That's why `runScenarios` returns per-scenario details."

**Open:** `test/regression.test.js` line 79 (`scenarioLostUpdate`) and line 97

**Show:**
```js
if (b.status !== 409) problems.push(`B's stale save was not rejected (status ${b.status}, expected 409)`);
```

**Say:**
> "Three scenarios through the real serializer and real HTTP: one-field edit, explicit clear, and the lost update reproduced sequentially - A and B read version 1, A saves, B saves with version 1 and must get 409.
>
> I also checked with mutations that it rejects partial fixes. Serializer fixed but no version check: fails. Version check but old serializer: fails. And the classic AI suggestion, 'just filter out the nulls': fails, because then nothing can be cleared."

**Mention:** the test pyramid - 44 tests in six files plus the regression gate, all on `node:assert/strict`.

---

## 32-38 min: AI workflow

**Open:** `AI_WORKFLOW.md` line 3 (`## Tools used`)

**Say:**
> "Claude Code implemented in the repo. A separate Claude session reviewed every plan, diff and output before I approved a commit. One step per prompt, one commit per step, nothing committed before review. And one rule I added early: show me the artifact, not a summary of it."

**Open:** line 32 (`## The moment the AI was wrong`)

**Open:** `test/client-flow.test.js` line 64

**Show:**
```js
const form = { ...original.filters, priceMax: 'abc', dateTo: '2026-06-20' };
```

**Say:**
> "The best catch was a test that could not fail. Claude Code wrote 'invalid priceMax sends no request and leaves the server unchanged'. It called the diff function, then asserted the server was unchanged - but it never called anything that sends a request. The assertion was always true. Removing the guard from the editor would have left it green.
>
> That's the same mechanism as the incident itself: the supplied test was green because it sent the full form.
>
> The root cause was architectural - the decision lived in JSX. I moved it into `submitSavedSearchEdit`, and the test now sends an invalid price together with a valid date. If the guard disappears, the date reaches the server and the test fails. I proved it by deleting the guard and watching it fail."

**Open:** line 19 (`## Where I intervened`) - pick 2 or 3:

> "**Required version:** the first plan left `expectedVersion` optional. Optional concurrency control is no concurrency control."

> "**Loose assertions:** every test used legacy `node:assert`, where `deepEqual({ priceMax: undefined }, { priceMax: null })` passes. In a task about null versus absent, that makes the assertions meaningless. Switched to strict in its own commit."

> "**Docs promising the impossible:** the AI wrote that NaN returns 400. It can't - JSON turns NaN into null, so the server returns 200 and deletes the filter. Same bug class as the incident, appearing for the second time."

> "**Green verify, live bug:** after the serializer fix alone, `verify` was 3 of 3 while the real editor still sent the whole form. I treated `verify` as necessary, not sufficient."

**Run (optional):** `git log --oneline`

> "Fourteen commits, one topic each, history unsquashed."

---

## 38-40 min: Residual risks

**Open:** `AI_WORKFLOW.md` line 219 (`## Ownership note`)

**Say:**
> "What I'd do before production:
>
> One - atomicity relies on a single process with an in-memory store. With a database it has to be a conditional `UPDATE ... WHERE version = ?` and a check of affected rows.
>
> Two - the JSX itself isn't executed by any test. The logic is extracted and tested, but I'd add a React Testing Library test and one Playwright test.
>
> Three - after a 409, Reload discards what the user typed. Better UX is to show their pending edit next to the new server state. The 409 body already carries that state, so it's a UI-only change.
>
> Four - dates are validated only as strings, with no format check and no `dateFrom <= dateTo`. The range check has to run on the merged state, because a patch can contain just one date.
>
> And what I'd do differently: write the regression test against the frozen original first, before any fix."

---

## If asked for a live change

**Say before touching anything:**
> "First I'll check which files this touches. Then a narrow prompt: one change, no commit, show me the diff and the test output. I'll read the diff before believing the summary, add a test that fails before and passes after, then run `npm test` and `npm run verify`."

| Likely request | Where |
|---|---|
| Add a filter (e.g. `brand`) | `FILTER_KEYS` in `src/app.js` line 17 **and** `src/client/buildSavedSearchPatch.js` **and** the hard-coded list in `SavedSearchEditor.jsx` (`['query', 'category', ...]`), plus tests and contract |
| Show the other person's change on 409 | `result.search` from `submitSavedSearchEdit` line 27 - store it in editor state and render it. No API change |
| 428 instead of 400 for a missing version | `src/app.js` line 27 + `test/api-validation.test.js` + contract |
| Version in `If-Match` header | `apiClient.saveEdit` + `app.js`; keep body support because `verify.js` must not change |
| Validate dates | format in `validatePatchBody`; `dateFrom <= dateTo` in `store.patch` on the merged `nextFilters`; mirror in `computeSavedSearchEdits` |
| Multiple saved searches | replace the single `search` variable in the store with a `Map` keyed by `id` |

## Quick answers

| Question | Answer |
|---|---|
| Why not ETag / If-Match? | Standard and a good direction, but the contract and `verify` put the version in the body. I kept the contract. |
| Why not merge non-conflicting edits? | Possible, since we send only changed keys. But the contract says mismatch = 409, nothing applied. Merging is a product decision. |
| Why two `FILTER_KEYS` lists? | The server is the trust boundary and shouldn't import client code. Trade-off: two places to update. |
| Why didn't you add a bundler? | The brief forbids a build tool. Extracting logic from JSX is the better design anyway. |
| What's mutation testing? | Deliberately breaking code in one place and checking a test fails. If none does, the test is worthless there. |
