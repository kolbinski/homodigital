# 02. All bugs and how they were fixed

I grouped the bugs into four groups: **client**, **server**, **tests**, **UI robustness**. For each one you will find: what it was, why it is a bug, how we fixed it, code before and after, and the test that guards it.

Quick overview map:

| # | Bug | Layer | Criterion | Commit |
|---|---|---|---|---|
| 1 | Serializer turns missing keys into `null` | client | B1, B2 | `80c5223` |
| 2 | Editor sends the whole form instead of changes | client | B1, B3 | `a5f5eba`, `c356884` |
| 3 | Client does not send `expectedVersion` | client | B3 | `c356884` |
| 4 | Server does not check the version | server | B3 | `1e257f3` |
| 5 | `body.filters \|\| body` fallback | server | data safety | `bf94906` |
| 6 | No key or type validation | server | data consistency | `bf94906`, `a5f5eba` |
| 7 | `priceMax` from the input as text, silent `Number()` coercions | client | data consistency | `a5f5eba` |
| 8 | NaN turns into `null`, i.e. into a delete | client | B2 (same class) | `a5f5eba`, `465b8e7` |
| 9 | Misleading tests (full form, loose assertions) | tests | detectability | `bf94906`, `717e7a3` |
| 10 | UI error handling (double click, endless "Loading…") | UI | robustness | `c356884` |

---

## BUG 1: the serializer turns every missing key into `null`

**File:** `src/client/buildSavedSearchPatch.js`

### Before

```js
function buildSavedSearchPatch(form) {
  const patch = {};
  for (const key of FILTER_KEYS) {        // ALWAYS all 5 keys
    patch[key] = form[key] ?? null;       // missing -> null
  }
  return patch;
}
```

### Why it is a bug

The call `buildSavedSearchPatch({ dateTo: '2026-06-20' })` (exactly what `verify` does in B1) returns:

```json
{ "query": null, "category": null, "dateFrom": null, "dateTo": "2026-06-20", "priceMax": null }
```

According to the contract `null` means "delete". So changing one date **wipes four other filters**. That is INC-702.

B2 works exactly the same way: `buildSavedSearchPatch({ priceMax: null })` puts `null` in every key, so it wipes everything, not just the price.

The function **does not distinguish "I don't know / not changing"** (absent key) **from "delete"** (`null`). It turns the first into the second.

### After

```js
function buildSavedSearchPatch(edits) {
  const patch = {};
  for (const key of Object.keys(edits)) {          // ONLY the keys that came in
    if (!FILTER_KEYS.includes(key)) throw new Error(`unknown filter key "${key}"`);
    const value = edits[key];
    if (value === undefined) continue;             // undefined = absent key
    if (key === 'priceMax' && value !== null && !(Number.isFinite(value) && value >= 0)) {
      throw new Error('priceMax must be a finite number >= 0, or null');
    }
    patch[key] = value;                            // null stays null (explicit clear)
  }
  return patch;
}
```

What changed:
1. The loop goes over the **input's keys**, not over all known keys. Whatever was not provided is not in the patch.
2. `null` passes through unchanged, because it is a deliberate "delete".
3. `undefined` is skipped explicitly (it would vanish in `JSON.stringify` anyway, but it is better to say so).
4. An unknown key throws. It is a programmer error; better loud than silently sent to the server.
5. An invalid `priceMax` throws (details in bug 8).

The **parameter name** changed too: `form` to `edits`. That is not cosmetic. The function now takes the changes, not the whole form.

### Tests that guard it
- `test/client-serializer.test.js` (10 tests, e.g. "single-key edit emits only that key", "explicit null is preserved"),
- `scripts/verify.js` B1 and B2,
- `test/regression.test.js` scenarios 1 and 2.

---

## BUG 2: the editor sends the whole form instead of only the changes

**Files:** `src/client/SavedSearchEditor.jsx`, new: `computeSavedSearchEdits.js`, `submitSavedSearchEdit.js`

### Before

```js
const { status: code, body } = await saveEdit(baseUrl, id, form);   // the whole form
```

### Why it is a bug (important, because it is not obvious)

After fixing bug 1 the serializer itself works fine and `verify` shows 3/3. **But the real UI still sends everything.** Consequences:

1. **Lost update on fields you did not touch.** A changes the category and saves. B, who loaded the page earlier, changes only the price, but sends the whole form, including the **old category**. Without version control, B silently reverts A's change. With version control B gets a 409 (because the version changed), so the data is safe, but only thanks to the version: the patch itself still lies that B changed the category.
2. **A semantic lie.** The patch claims the user changed 5 fields, when they changed one.
3. **The "green test, live bug" trap.** `verify` tests the serializer directly, not the editor. This was one of our main findings.

### After: step 1, a pure diff function

`src/client/computeSavedSearchEdits.js` compares what was loaded from the server with what is in the form:

```js
function computeSavedSearchEdits(originalFilters, form) {
  const edits = {};
  const errors = {};
  for (const key of FILTER_KEYS) {
    const formValue = form[key];
    const originalValue = originalFilters[key];
    const formEmpty = isEmpty(formValue);           // undefined, null, "" or whitespace only
    const originalEmpty = isEmpty(originalValue);

    if (key === 'priceMax') { /* separate number handling, see bug 7 */ }

    if (formEmpty) {
      if (!originalEmpty) edits[key] = null;        // had a value, now empty = clear
      continue;                                     // empty and empty = nothing
    }
    if (originalEmpty || formValue !== originalValue) edits[key] = formValue;  // change
  }
  return { edits, errors };
}
```

The logic as a table:

| Original | Form | Result |
|---|---|---|
| `'laptops'` | `'laptops'` | key absent (no change) |
| `'laptops'` | `'tablets'` | `query: 'tablets'` |
| `'laptops'` | `''` or `'   '` | `query: null` (clear) |
| absent | `null` / `''` | key absent (empty = empty) |

"Empty" and "absent" are treated the same. Otherwise, after clearing a filter, every subsequent save would send a needless `null`.

Why a pure function in a separate file? Because **JSX does not run in Node without a bundler**, and adding a bundler is not allowed. Logic in a separate `.js` file can be tested with plain `node`.

### After: step 2, the save-decision module

`src/client/submitSavedSearchEdit.js` holds all the logic of the "Save" button, taken out of the JSX:

```js
async function submitSavedSearchEdit(baseUrl, id, search, form) {
  const { edits, errors } = computeSavedSearchEdits(search.filters, form);

  if (Object.keys(errors).length > 0) return { kind: 'invalid', errors };   // send nothing
  if (Object.keys(edits).length === 0) return { kind: 'unchanged' };        // send nothing

  const { status, body } = await saveEdit(baseUrl, id, search.version, edits);
  if (status === 200) return { kind: 'saved', search: body };
  if (status === 409) return { kind: 'conflict', search: body && body.search };
  return { kind: 'error', status, error: (body && body.error) || 'error' };
}
```

It returns one of five results (`kind`), and the editor just turns it into a UI message.

Why does "unchanged" not send a request? Because the server will accept an empty patch `{}` and **bump the version** while changing nothing. That would invalidate the version for other editors for no reason.

### After: step 3, the editor

```js
const result = await submitSavedSearchEdit(baseUrl, id, search, form);
if (result.kind === 'invalid') { setStatus(Object.values(result.errors).join(' ')); }
else if (result.kind === 'unchanged') { setStatus('No changes to save.'); }
else if (result.kind === 'saved') { setSearch(result.search); setForm({ ...result.search.filters }); setStatus('Saved.'); setConflict(false); }
else if (result.kind === 'conflict') { setStatus('Someone else changed this search. Click Reload ...'); setConflict(true); }
else { setStatus(`Could not save (${result.status}): ${result.error}`); }
```

### Tests
- `test/client-edits.test.js` (16 tests of the diff function),
- `test/client-flow.test.js` (5 tests of the whole flow over real HTTP).

---

## BUG 3: the client does not send `expectedVersion`

**File:** `src/client/apiClient.js`

### Before
```js
async function saveEdit(baseUrl, id, form) {
  const patch = buildSavedSearchPatch(form);
  ... body: JSON.stringify(patch),            // filters only, no version
```

### After
```js
async function saveEdit(baseUrl, id, expectedVersion, edits) {
  const filters = buildSavedSearchPatch(edits);
  const res = await fetch(..., {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedVersion, filters }),   // format from the contract
  });
  let body;
  try { body = await res.json(); } catch { body = null; }  // resilient to non-JSON
  return { status: res.status, body };
}
```

The version comes from `search.version`, i.e. what the editor **last loaded**. Also `res.json()` is wrapped in `try`: if the server or a proxy returns e.g. an HTML error page, the client will not blow up.

---

## BUG 4: the server does not check the version (lost update)

**Files:** `src/server/savedSearchStore.js`, `src/app.js`

### Before
```js
patch(id, patch) {
  if (id !== search.id) return null;
  // ... merges and always bumps the version
```

Two writes with the same version both get 200, the version goes 1 → 3, and the second silently wins.

### After: store
```js
patch(id, expectedVersion, filters) {
  if (id !== search.id) return { ok: false, reason: 'not_found' };
  if (expectedVersion !== search.version) {
    return { ok: false, reason: 'conflict', search: structuredClone(search) };  // changes nothing
  }
  const nextFilters = { ...search.filters };
  for (const [key, value] of Object.entries(filters)) {
    if (value === null) delete nextFilters[key];
    else nextFilters[key] = value;
  }
  search = { ...search, filters: nextFilters, version: search.version + 1 };
  return { ok: true, search: structuredClone(search) };
}
```

### After: app.js
```js
const result = store.patch(match[1], body.expectedVersion, body.filters);
if (result.ok) return sendJson(response, 200, result.search);
if (result.reason === 'conflict') {
  return sendJson(response, 409, { error: 'version_conflict', search: result.search });
}
return sendJson(response, 404, { error: 'not_found' });
```

### The most important detail: atomicity

"Check the version" and "write" happen **in one synchronous function, with no `await` in between**.

Plain explanation: Node.js runs JavaScript on a **single thread**. A synchronous function runs from start to end without interruption, so nobody else can "squeeze in" the middle. If it were:

```js
// WRONG (hypothetically):
if (expectedVersion !== search.version) return conflict;
await somethingAsync();         // <- another request can write here!
search = ...;                   // we overwrite its write
```

then a second request could pass the check during that `await`, and both would write. Without `await` that scenario is impossible.

The 409 body contains the **current state** (`search`) so the client can show it.

Order of checks in PATCH: bad JSON → **400**, validation → **400**, unknown id → **404**, wrong version → **409**, OK → **200**.

### Tests
- `test/api-concurrency.test.js`: stale version → 409 and nothing changes; matching → 200 and +1; two in parallel → one 200, one 409; unknown id → 404,
- `verify` B3, regression scenario 3, `client-flow` (two editors).

---

## BUG 5: the `body.filters || body` fallback

**File:** `src/app.js`

### Before
```js
const search = store.patch(match[1], body.filters || body);
```

### Why it is dangerous

The client sends `{ "expectedVersion": 3 }` without `filters`. The server takes the **whole body** as filters and stores a filter named `expectedVersion` with the value 3. Garbage in the data. Every field of the body ends up in the filters.

In its first plan Claude Code described this only as "missing validation". It is not missing validation, it is an active bug. We caught it in review.

### After
Fallback removed, `filters` is required (see bug 6). Test: `api-validation.test.js` → "filters absent -> 400, does not fall back to treating the body as the patch", which also checks that `expectedVersion` did **not** appear in the filters.

---

## BUG 6: no validation

**File:** `src/app.js`

### After
```js
function validatePatchBody(body) {
  if (!isPlainObject(body)) return 'body must be a JSON object';
  if (!Number.isInteger(body.expectedVersion)) return 'expectedVersion is required and must be an integer';
  if (!isPlainObject(body.filters)) return 'filters is required and must be an object';
  for (const [key, value] of Object.entries(body.filters)) {
    if (!FILTER_KEYS.includes(key)) return `unknown filter key "${key}"`;
    if (key === 'priceMax') {
      if (value !== null && (!Number.isFinite(value) || value < 0)) return 'priceMax must be a non-negative number or null';
    } else if (value !== null && typeof value !== 'string') {
      return `${key} must be a string or null`;
    }
  }
  return null;   // null = no error
}
```

Rules:
- **`expectedVersion` is required.** If it were optional, a client without a version would bypass the whole lost-update protection.
- We validate **the whole request before any change**, so there is no partial write.
- Only the 5 known keys.
- `priceMax`: a number ≥ 0 or `null`; the rest: a string or `null`.
- `isPlainObject` rejects `null` and arrays (`typeof [] === 'object'` in JS, hence the separate check).

`FILTER_KEYS` is defined **separately** in the server and the client. A deliberate decision: the server is the trust boundary and should not import client code.

### Tests
`test/api-validation.test.js`: 7 cases, each checks 400 **and** that the version and filters did not change.

---

## BUG 7: `priceMax` from a text field and silent coercions

**File:** `src/client/computeSavedSearchEdits.js`

### The problem
`<input>` always returns **text**. The user types `450`, and `"450"` (a string) would go to the server. The original server would store it (no validation), so the numeric data would contain text.

Plain `Number("...")` is too permissive:

| Input | `Number()` |
|---|---|
| `"0x1F4"` | 500 (hexadecimal!) |
| `"0b111110100"` | 500 (binary!) |
| `"1e3"` | 1000 |
| `"-50"` | -50 |
| `"   "` | **0** (!) |

### After
```js
const PRICE_MAX_PATTERN = /^\d+(\.\d{1,2})?$/;    // digits, optionally up to 2 decimal places

function parsePriceMax(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : NaN;
  const trimmed = String(value).trim();
  return PRICE_MAX_PATTERN.test(trimmed) ? Number(trimmed) : NaN;
}
```

In `computeSavedSearchEdits` we check emptiness (`isEmpty`) first, and **only then** parse. That way `"   "` means "clear", not "set the cap to 0".

```js
if (key === 'priceMax') {
  if (formEmpty) { if (!originalEmpty) edits.priceMax = null; continue; }
  const parsed = parsePriceMax(formValue);
  if (!Number.isFinite(parsed)) { errors.priceMax = '...'; continue; }   // error, not an edit
  if (originalEmpty || parsed !== originalValue) edits.priceMax = parsed;
  continue;
}
```

Comparing after conversion means `"500"` against an original `500` is **not** a change.

The server accepts any finite number ≥ 0 (e.g. 499.999), the client enforces the format a human types. The server protects the data, the client protects the UX.

---

## BUG 8: NaN turns into `null`, i.e. into a delete

The subtlest bug in the task, the same class as INC-702.

### The mechanism
```js
Number("abc")                       // NaN
JSON.stringify({ priceMax: NaN })   // '{"priceMax":null}'
```

JSON **has no** representation for `NaN` or `Infinity`, so `JSON.stringify` silently turns them into `null`. The server receives a valid `null` and **removes the price cap**. The user made a typo and lost a filter. Server validation will not catch it, because it sees a valid request.

### Where it appeared
1. In Claude Code's plan: the proposed `Number(form.priceMax)` with no error handling.
2. In AI-written documentation: "NaN → 400". Not true; the server will never see NaN.

### Fix: defense in depth
- `computeSavedSearchEdits`: bad input → `errors.priceMax`, no edit,
- `submitSavedSearchEdit`: errors → `kind: 'invalid'`, **nothing goes to the server**,
- `buildSavedSearchPatch`: NaN, Infinity, negative number → exception (because the serializer can be called directly, e.g. by `verify`),
- `docs/api-contract.md`: corrected + a "Client responsibilities" section.

---

## BUG 9: tests that did not check what they promised

### 9a. The "full-form save" test
It sends the full form, so it cannot reproduce the incident. Once `expectedVersion` became required it would start getting 400, so we updated it (GET the version, send with the version, check `r.status === 200`). We kept it because it is part of the supplied suite.

### 9b. Loose assertions (`node:assert`)
Legacy mode compares with `==`:
```js
assert.deepEqual({ priceMax: undefined }, { priceMax: null })  // PASSES
assert.equal(500, '500')                                         // PASSES
```
In a task that is entirely about the difference between `null` and absent, such a test checks nothing. Switched to `require('node:assert/strict')` in all our tests (`717e7a3`). Nothing failed after the switch, i.e. it was a safety net for the future, not a fix for a hidden bug. That is how we describe it, honestly.

### 9c. Empty regression skeleton
`check()` returned `false`. We wrote a full test (file 07).

---

## BUG 10: editor robustness

### 10a. Double-clicking "Save"
Two requests with the same version: the first gets 200, the second 409, and the user sees "Someone else changed this search" about **their own** save. Also, if they typed during the save, `setForm(body.filters)` after the 200 wiped what they typed.

```js
const [saving, setSaving] = useState(false);
async function onSave() {
  if (saving) return;
  setSaving(true);
  try { /* ... */ } finally { setSaving(false); }
}
// and on every control: disabled={saving}
```

### 10b. Endless "Loading…"
The original did not catch errors from `getSavedSearch`. Now `load()` has a `.catch`; a failed initial load shows "Could not load: …", a failed Reload shows "Could not reload: …".

### 10c. No auto-retry on 409 (a deliberate decision)
A tempting "fix": on 409, take the new version from the response and send again. **That reintroduces the lost update**, because you overwrite someone else's change with a decision made on stale data, without the user knowing. Instead there is a message and a Reload button. The `client-flow` test fails if someone adds auto-retry (verified by mutation).

---

## Summary: why the fix had to cover every layer

| If you fixed only… | What would still be broken |
|---|---|
| the serializer | the UI sends the whole form, no version control (B3) |
| the server (versions) | the serializer still wipes filters (B1, B2) |
| "filter out nulls" in the serializer | nothing can be cleared (B2) - the classic AI "fix" |
| serializer + server | the UI still sends old values of untouched fields |

The regression test rejects each of these partial fixes (details in file 07).
