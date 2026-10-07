# 10. Every code change: before and after

A comparison of two zips: **before** (`Krzysztof-Olbinski.zip`, the starting state) and **after** (`Krzysztof-Olbinski-main.zip`, the submitted state). The explanatory comments marked in the "after" code are written for you; the comments in the real repo are shorter.

## Change map

| File | Status | Why |
|---|---|---|
| `src/app.js` | changed | PATCH validation, fallback removed, 409 handling |
| `src/server/savedSearchStore.js` | changed | atomic version check |
| `src/client/buildSavedSearchPatch.js` | changed | sends only the given keys, blocks NaN |
| `src/client/apiClient.js` | changed | sends `{ expectedVersion, filters }` |
| `src/client/SavedSearchEditor.jsx` | changed | UI only, logic in new modules |
| `src/client/computeSavedSearchEdits.js` | **new** | diff of the form vs the loaded filters |
| `src/client/submitSavedSearchEdit.js` | **new** | save decision, testable without a bundler |
| `test/given.test.js` | changed | sends the version, strict assertions |
| `test/regression.test.js` | changed (was a skeleton) | required cross-boundary test |
| `test/api-validation.test.js` | **new** | 400 on bad data |
| `test/api-concurrency.test.js` | **new** | 409, no lost update |
| `test/client-serializer.test.js` | **new** | serializer tests |
| `test/client-edits.test.js` | **new** | form diff tests |
| `test/client-flow.test.js` | **new** | the whole client flow over HTTP |
| `test/run-regression.js` | **new** | regression on src and on the original |
| `package.json` | changed | `npm test` runs every test |

**Unchanged** (as required): `scripts/verify.js`, `test/reference_defect.js`, `additional-backend-tasks/`, `public/index.html`, `TASK_BRIEF.md`, `CROSS-STACK-SPEC.md`, `docs/incident.md`, `docs/ai-recommendation.md`.

**Documentation** (changed, described briefly at the end): `README.md`, `docs/api-contract.md`, `AI_WORKFLOW.md`, new `docs/ai-session-transcript.md`.

---

# PART A: CHANGED FILES

## A1. `src/app.js` (HTTP server)

### BEFORE (the part that changed)

```js
/**
 *   PATCH /api/saved-searches/:id      -> 200 the updated search, or 404 / 400
 *
 * This is the shipped server. It has defects. See docs/incident.md.
 */

const http = require('node:http');
const { createSavedSearchStore } = require('./server/savedSearchStore');

// ... readJson, sendJson unchanged ...

    if (match && request.method === 'PATCH') {
      try {
        const body = await readJson(request);
        // As shipped: the whole body is treated as the filter patch. No version
        // check, no validation of keys or values.
        const search = store.patch(match[1], body.filters || body);
        return search ? sendJson(response, 200, search) : sendJson(response, 404, { error: 'not_found' });
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }
```

### AFTER

```js
/**
 *   GET   /api/saved-searches/:id      -> 200 the search, or 404
 *   PATCH /api/saved-searches/:id      -> 200 the updated search, or 400 / 404 / 409
 *                                                                          ^^^ NEW: version conflict
 * PATCH requires { expectedVersion, filters }: ...
 */

const http = require('node:http');
const { createSavedSearchStore } = require('./server/savedSearchStore');

// NEW: the list of allowed keys on the server side.
// Deliberately separate from the client's list - the server is the trust
// boundary and does not import client code.
const FILTER_KEYS = ['query', 'category', 'dateFrom', 'dateTo', 'priceMax'];

// NEW: "plain object" = not null and not an array.
// In JS typeof null === 'object' and typeof [] === 'object', hence the two extra conditions.
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// NEW: validation of the WHOLE request, before anything is changed.
// Returns an error message or null (= everything OK).
// It does not compare the version with the stored one - store.patch does that (see A2).
function validatePatchBody(body) {
  if (!isPlainObject(body)) return 'body must be a JSON object';

  // Version REQUIRED. If it were optional, a client without a version would
  // bypass all concurrency control (B3 fixed only for show).
  if (!Number.isInteger(body.expectedVersion)) return 'expectedVersion is required and must be an integer';

  // filters REQUIRED. This replaces the old `body.filters || body` fallback.
  if (!isPlainObject(body.filters)) return 'filters is required and must be an object';

  for (const [key, value] of Object.entries(body.filters)) {
    // Only the 5 known keys - nothing foreign gets into the data.
    if (!FILTER_KEYS.includes(key)) return `unknown filter key "${key}"`;

    if (key === 'priceMax') {
      // A finite number >= 0 or null (null = clear).
      // The string "450" is rejected - it must be a real JSON number.
      if (value !== null && (!Number.isFinite(value) || value < 0)) return 'priceMax must be a non-negative number or null';
    } else if (value !== null && typeof value !== 'string') {
      // Other filters: a string or null.
      return `${key} must be a string or null`;
    }
  }
  return null;
}

// ... readJson, sendJson unchanged ...

    if (match && request.method === 'PATCH') {
      try {
        const body = await readJson(request);           // bad JSON -> exception -> 400 (catch below)

        // NEW: validation first -> 400
        const validationError = validatePatchBody(body);
        if (validationError) return sendJson(response, 400, { error: validationError });

        // CHANGE: the store gets the version and ONLY the filters (no fallback to the whole body).
        const result = store.patch(match[1], body.expectedVersion, body.filters);

        // NEW: the store returns a result object, we map it to HTTP codes.
        if (result.ok) return sendJson(response, 200, result.search);
        if (result.reason === 'conflict') {
          // 409 + the current state, so the client can show it.
          return sendJson(response, 409, { error: 'version_conflict', search: result.search });
        }
        return sendJson(response, 404, { error: 'not_found' });
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }
```

**Order of checks:** bad JSON → 400, validation → 400, unknown id → 404, wrong version → 409, OK → 200.

---

## A2. `src/server/savedSearchStore.js` (data store)

### BEFORE

```js
    /**
     * As shipped, this merges the patch over the existing filters and treats a
     * null value as "delete this filter". It does not look at versions, and it
     * does not validate the incoming keys or values.
     */
    patch(id, patch) {
      if (id !== search.id) return null;

      const filters = { ...search.filters };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete filters[key];
        else filters[key] = value;
      }

      search = { ...search, filters, version: search.version + 1 };
      return structuredClone(search);
    },
```

### AFTER

```js
    /**
     * Returns one of three results:
     *   { ok: true, search }                      - written, version +1
     *   { ok: false, reason: 'not_found' }        - unknown id
     *   { ok: false, reason: 'conflict', search } - stale version, NOTHING changed
     */
    patch(id, expectedVersion, filters) {               // CHANGE: new expectedVersion parameter
      if (id !== search.id) return { ok: false, reason: 'not_found' };   // was: return null

      // NEW: the heart of optimistic concurrency.
      // If the client edited a different version than the current one -> conflict, with no change.
      // We return a COPY (structuredClone), so nobody outside can modify the data.
      if (expectedVersion !== search.version) {
        return { ok: false, reason: 'conflict', search: structuredClone(search) };
      }

      // Merge logic UNCHANGED (it was correct from the start):
      //   null   -> delete the filter
      //   value  -> set the filter
      //   absent -> leave it alone
      const nextFilters = { ...search.filters };        // only the variable name changed
      for (const [key, value] of Object.entries(filters)) {
        if (value === null) delete nextFilters[key];
        else nextFilters[key] = value;
      }

      search = { ...search, filters: nextFilters, version: search.version + 1 };
      return { ok: true, search: structuredClone(search) };   // was: return structuredClone(search)
    },
```

**Most important:** the whole function is **synchronous** (zero `await`). Node runs JS on one thread, so between "check the version" and "write" no other request can squeeze in. That is an atomic check-and-set.

**What did NOT change:** the merge logic. The store understood the three cases correctly from the start. The B1/B2 bug was in what reached it (the client), not in the store itself.

---

## A3. `src/client/buildSavedSearchPatch.js` (client serializer)

### BEFORE

```js
const FILTER_KEYS = ['query', 'category', 'dateFrom', 'dateTo', 'priceMax'];

function buildSavedSearchPatch(form) {
  const patch = {};
  for (const key of FILTER_KEYS) {
    patch[key] = form[key] ?? null;
  }
  return patch;
}
```

**Problem:** the loop always goes over 5 keys, and `?? null` turns absent into `null`.
`buildSavedSearchPatch({ dateTo: 'X' })` → `{ query: null, category: null, dateFrom: null, dateTo: 'X', priceMax: null }`, i.e. delete 4 filters.

### AFTER

```js
const FILTER_KEYS = ['query', 'category', 'dateFrom', 'dateTo', 'priceMax'];

// Parameter RENAMED: form -> edits.
// The function now takes ONLY the changes, not the whole form.
function buildSavedSearchPatch(edits) {
  const patch = {};

  // CHANGE: the loop goes over the INPUT's keys, not over all known keys.
  // Not provided -> not in the patch -> the server doesn't touch it.
  for (const key of Object.keys(edits)) {

    // NEW: an unknown key = a programmer error. A loud exception
    // instead of silently sending garbage.
    if (!FILTER_KEYS.includes(key)) throw new Error(`unknown filter key "${key}"`);

    const value = edits[key];

    // NEW: undefined is treated like an absent key.
    // (JSON.stringify would drop it anyway, but explicit is better.)
    if (value === undefined) continue;

    // NEW: guard against NaN / Infinity / negative numbers.
    // JSON.stringify({ priceMax: NaN }) === '{"priceMax":null}',
    // i.e. NaN would silently turn into "remove the price cap".
    // We check here because other code calls this function too (e.g. scripts/verify.js).
    if (key === 'priceMax' && value !== null && !(Number.isFinite(value) && value >= 0)) {
      throw new Error('priceMax must be a finite number >= 0, or null');
    }

    // null passes through unchanged = a deliberate "clear this filter".
    patch[key] = value;
  }
  return patch;
}

module.exports = { buildSavedSearchPatch, FILTER_KEYS };
```

---

## A4. `src/client/apiClient.js` (HTTP client)

### BEFORE

```js
/**
 * Persist an edit. `form` is the current state of the edit form.
 */
async function saveEdit(baseUrl, id, form) {
  const patch = buildSavedSearchPatch(form);
  const res = await fetch(`${baseUrl}/api/saved-searches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return { status: res.status, body: await res.json() };
}
```

### AFTER

```js
/**
 * edits = the result of computeSavedSearchEdits, i.e. ONLY the changed fields.
 */
async function saveEdit(baseUrl, id, expectedVersion, edits) {   // CHANGE: new version parameter
  const filters = buildSavedSearchPatch(edits);
  const res = await fetch(`${baseUrl}/api/saved-searches/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },

    // CHANGE: the contract format { expectedVersion, filters }.
    // Before, only the filters were sent, and it worked only thanks to the server's fallback.
    body: JSON.stringify({ expectedVersion, filters }),
  });

  // NEW: resilience to a response that is not JSON
  // (e.g. an HTML error page from a proxy). Instead of blowing up -> body = null.
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}
```

`getSavedSearch` unchanged.

---

## A5. `src/client/SavedSearchEditor.jsx` (React form)

### BEFORE

```jsx
import React, { useEffect, useState } from 'react';
import { getSavedSearch, saveEdit } from './apiClient.js';

export default function SavedSearchEditor({ baseUrl = '', id = 'cheap-laptops' }) {
  const [search, setSearch] = useState(null);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    getSavedSearch(baseUrl, id).then((s) => {        // no error handling
      setSearch(s);
      setForm({ ...s.filters });
    });
  }, [baseUrl, id]);

  if (!search) return <p>Loading…</p>;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value === '' ? null : value }));
  }

  async function onSave() {
    const { status: code, body } = await saveEdit(baseUrl, id, form);   // the whole form, no version
    if (code === 200) { setSearch(body); setForm({ ...body.filters }); setStatus('Saved.'); }
    else if (code === 409) setStatus('Someone else changed this search. Reload and reapply your edit.');
    else setStatus(`Could not save (${code}): ${body.error || 'error'}`);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <h2>{search.name}</h2>
      {['query', 'category', 'dateFrom', 'dateTo', 'priceMax'].map((key) => (
        <label key={key}>
          {key}
          <input value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
        </label>
      ))}
      <button type="button" onClick={() => set('priceMax', null)}>Clear price cap</button>
      <button type="submit">Save</button>
      <p role="status">{status}</p>
    </form>
  );
}
```

### AFTER

```jsx
import React, { useEffect, useState } from 'react';
import { getSavedSearch } from './apiClient.js';                 // CHANGE: saveEdit no longer here
import { submitSavedSearchEdit } from './submitSavedSearchEdit.js';  // NEW: all save logic

export default function SavedSearchEditor({ baseUrl = '', id = 'cheap-laptops' }) {
  const [search, setSearch] = useState(null);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');
  const [conflict, setConflict] = useState(false);    // NEW: whether to show the Reload button
  const [loadError, setLoadError] = useState('');     // NEW: load error
  const [saving, setSaving] = useState(false);        // NEW: lock while saving

  // NEW: loading as a separate function (used on start and on Reload),
  // with error handling. Before, an error = endless "Loading…".
  function load() {
    return getSavedSearch(baseUrl, id)
      .then((s) => {
        setSearch(s);
        setForm({ ...s.filters });
        setLoadError('');
        return { ok: true };
      })
      .catch((e) => {
        setLoadError(e.message);
        return { ok: false, error: e.message };
      });
  }

  useEffect(() => { load(); }, [baseUrl, id]);

  // NEW: a message instead of endless "Loading…"
  if (loadError && !search) return <p role="alert">Could not load: {loadError}</p>;
  if (!search) return <p>Loading…</p>;

  // CHANGE: no '' -> null conversion. The form keeps the raw text,
  // and the interpretation ("empty = clear") is done by computeSavedSearchEdits.
  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSave() {
    if (saving) return;                 // NEW: double-click protection
    setSaving(true);
    try {
      // NEW: the whole decision lives in a separate, testable module.
      // The component only turns the result (kind) into a message.
      const result = await submitSavedSearchEdit(baseUrl, id, search, form);
      if (result.kind === 'invalid') {
        setStatus(Object.values(result.errors).join(' '));       // e.g. bad price - nothing sent
      } else if (result.kind === 'unchanged') {
        setStatus('No changes to save.');                         // empty diff - nothing sent
      } else if (result.kind === 'saved') {
        setSearch(result.search);                                 // new version from the server
        setForm({ ...result.search.filters });
        setStatus('Saved.');
        setConflict(false);
      } else if (result.kind === 'conflict') {
        // 409: NO automatic retry. Auto-retry would overwrite someone else's change
        // with a decision made on stale data - i.e. bring back the lost update.
        setStatus('Someone else changed this search. Click Reload to see the latest version, then reapply your edit.');
        setConflict(true);
      } else {
        setStatus(`Could not save (${result.status}): ${result.error}`);
      }
    } finally {
      setSaving(false);                 // always unlock, even on an exception
    }
  }

  // NEW: the Reload button after a conflict
  async function onReload() {
    const result = await load();
    if (result.ok) { setStatus('Reloaded.'); setConflict(false); }
    else setStatus(`Could not reload: ${result.error}`);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <h2>{search.name}</h2>
      {['query', 'category', 'dateFrom', 'dateTo', 'priceMax'].map((key) => (
        <label key={key}>
          {key}
          {/* NEW: disabled={saving} - you can't type during a save,
              so a 200 response won't wipe freshly typed text */}
          <input value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} disabled={saving} />
        </label>
      ))}
      <button type="button" onClick={() => set('priceMax', null)} disabled={saving}>Clear price cap</button>
      <button type="submit" disabled={saving}>Save</button>
      <p role="status">{status}</p>
      {/* NEW: Reload visible only after a conflict */}
      {conflict && <button type="button" onClick={onReload} disabled={saving}>Reload</button>}
    </form>
  );
}
```

**Note for the interview:** the key list in the JSX (`['query', 'category', ...]`) is still hard-coded. Adding a new filter means changing this place + `FILTER_KEYS` in `app.js` and in `buildSavedSearchPatch.js`.

---

## A6. `test/given.test.js` (supplied tests)

```diff
-const assert = require('node:assert');
+const assert = require('node:assert/strict');     // strict comparisons (=== instead of ==)

   await test('a full-form save updates a field', () => withApp(async (base) => {
+    // NEW: fetch the current version first, because it is now required
+    const before = await (await fetch(`${base}/api/saved-searches/cheap-laptops`)).json();
     const filters = buildSavedSearchPatch({ ... });
     const r = await fetch(`${base}/api/saved-searches/cheap-laptops`, {
-      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters }),
+      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
+      body: JSON.stringify({ expectedVersion: before.version, filters }),   // NEW: version
     });
+    assert.equal(r.status, 200);     // NEW: a clear failure instead of a TypeError on 400
```

Why it changed: without a version the server now returns 400, so the test would start failing.

---

## A7. `test/regression.test.js` (required cross-boundary test)

### BEFORE (skeleton)

```js
async function check({ createApp, buildSavedSearchPatch }) {
  // TODO: replace with a real check.
  return false;
}
module.exports = { check };
```

### AFTER (abridged, with comments)

```js
// The test uses ONLY the injected createApp and buildSavedSearchPatch + fetch.
// That lets us run the same code on src/ (must pass)
// and on test/reference_defect.js (must fail).

function withApp(createApp, run) {
  const app = createApp();
  // listen(0) = the OS picks a free port; every scenario gets a fresh server
  return new Promise((resolve) => app.listen(0, '127.0.0.1', resolve)).then(async () => { ... });
}

// SCENARIO 1: editing one field does not touch the others
async function scenarioOneFieldEdit({ createApp, buildSavedSearchPatch }) {
  ...
  const before = await getJson(base);
  const filters = buildSavedSearchPatch({ dateTo: '2026-06-20' });   // only the change, as in the contract
  await patchJson(base, { expectedVersion: before.version, filters });
  const f = (await getJson(base)).filters || {};
  if (f.dateTo !== '2026-06-20') problems.push('dateTo was not updated');
  for (const key of ['query', 'category', 'dateFrom', 'priceMax']) {
    // the key must EXIST and have its ORIGINAL value (!== = strict comparison)
    if (!(key in f) || f[key] !== before.filters[key]) problems.push(`"${key}" was not preserved`);
  }
  ...
}

// SCENARIO 2: an explicit clear removes only that filter
async function scenarioExplicitClear(...) {
  const filters = buildSavedSearchPatch({ priceMax: null });
  // priceMax must disappear, the other 4 untouched
}

// SCENARIO 3: lost update reproduced sequentially (deterministically)
async function scenarioLostUpdate(...) {
  const read = await getJson(base);                  // A and B read the same version
  const a = await patchJson(base, { expectedVersion: read.version, filters: buildSavedSearchPatch({ category: 'Books' }) });
  const b = await patchJson(base, { expectedVersion: read.version, filters: buildSavedSearchPatch({ priceMax: 300 }) });
  // requirements: A = 200, B = 409, category Books, price STILL 500, version +1
}

// Each scenario catches exceptions and returns { name, pass, detail },
// so you can see WHY something failed (not just true/false).
async function runScenarios(deps) { ... }

async function check(deps) {
  const results = await runScenarios(deps);
  return results.every((r) => r.pass);    // true only if all 3 passed
}

module.exports = { check, runScenarios };
```

---

## A8. `package.json`

```diff
-  "scripts": { "test": "node test/given.test.js", ... },
+  "scripts": { "test": "node test/given.test.js && node test/api-validation.test.js && node test/api-concurrency.test.js && node test/client-serializer.test.js && node test/client-edits.test.js && node test/client-flow.test.js && node test/run-regression.js", ... },
```

`&&` means: the next file runs only if the previous one succeeded. A single failure is enough for `npm test` to fail. No new dependencies.

---

# PART B: NEW FILES

## B1. `src/client/computeSavedSearchEdits.js` (form diff)

```js
'use strict';
// Compares the form with the filters loaded from the server
// and returns ONLY what the user actually changed.

const { FILTER_KEYS } = require('./buildSavedSearchPatch');

// "Empty" = undefined, null, "" or whitespace only. Empty and absent are the same.
function isEmpty(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

// Digits + optionally up to 2 decimal places. Rejects what Number() would let through:
// Number("0x1F4") === 500, Number("1e3") === 1000, Number("   ") === 0, Number("-50") === -50
const PRICE_MAX_PATTERN = /^\d+(\.\d{1,2})?$/;

// Returns a number or NaN (NaN = error, it never reaches edits).
function parsePriceMax(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : NaN;
  const trimmed = String(value).trim();
  return PRICE_MAX_PATTERN.test(trimmed) ? Number(trimmed) : NaN;
}

function computeSavedSearchEdits(originalFilters, form) {
  const edits = {};    // what to send
  const errors = {};   // what is invalid

  for (const key of FILTER_KEYS) {
    const formValue = form[key];
    const originalValue = originalFilters[key];
    const formEmpty = isEmpty(formValue);
    const originalEmpty = isEmpty(originalValue);

    if (key === 'priceMax') {
      // Check emptiness BEFORE parsing - otherwise "   " would give 0 instead of "clear".
      if (formEmpty) {
        if (!originalEmpty) edits.priceMax = null;   // had a value -> now empty = clear
        continue;                                    // empty -> empty = no change
      }
      const parsed = parsePriceMax(formValue);
      if (!Number.isFinite(parsed)) {
        // Bad input -> an error, NOT an edit. Never NaN, never a silent null.
        errors.priceMax = 'priceMax must be a non-negative number (max 2 decimal places)';
        continue;
      }
      // Compare AFTER conversion: "500" vs 500 -> no change.
      if (originalEmpty || parsed !== originalValue) edits.priceMax = parsed;
      continue;
    }

    // Text filters:
    if (formEmpty) {
      if (!originalEmpty) edits[key] = null;         // cleared
      continue;
    }
    if (originalEmpty || formValue !== originalValue) edits[key] = formValue;   // changed
  }

  return { edits, errors };
}

module.exports = { computeSavedSearchEdits };
```

| Original | Form | Result |
|---|---|---|
| `'laptops'` | `'laptops'` | nothing |
| `'laptops'` | `'tablets'` | `query: 'tablets'` |
| `'laptops'` | `''` | `query: null` |
| absent | `null` / `''` | nothing |
| `500` | `'500'` | nothing |
| `500` | `'450'` | `priceMax: 450` |
| `500` | `'abc'` | `errors.priceMax` |

---

## B2. `src/client/submitSavedSearchEdit.js` (save decision)

```js
'use strict';
// All the logic of the "Save" button, taken out of the JSX so it can be tested
// in plain Node (JSX needs a bundler, and adding a bundler is not allowed).

const { computeSavedSearchEdits } = require('./computeSavedSearchEdits');
const { saveEdit } = require('./apiClient');

async function submitSavedSearchEdit(baseUrl, id, search, form) {
  const { edits, errors } = computeSavedSearchEdits(search.filters, form);

  // GUARD 1: errors -> send nothing (not even the valid fields).
  if (Object.keys(errors).length > 0) return { kind: 'invalid', errors };

  // GUARD 2: no changes -> send nothing.
  // The server would accept an empty patch {} and bump the version, invalidating it for others for no reason.
  if (Object.keys(edits).length === 0) return { kind: 'unchanged' };

  // Only here does the network come in. search.version = the version the user SAW.
  const { status, body } = await saveEdit(baseUrl, id, search.version, edits);
  if (status === 200) return { kind: 'saved', search: body };
  if (status === 409) return { kind: 'conflict', search: body && body.search };   // no auto-retry
  return { kind: 'error', status, error: (body && body.error) || 'error' };
}

module.exports = { submitSavedSearchEdit };
```

---

## B3. `test/api-validation.test.js` (7 tests: 400 on bad data)

The common pattern of every test: send a bad request → expect **400** → check that **the version and filters did not change** (`assertUnchanged`). All of them send `expectedVersion: 1` (the current version), so the 400 comes from validation and not from a version conflict.

```js
function assertUnchanged(before, after) {
  assert.equal(after.version, before.version, 'version must not change on a rejected patch');
  assert.deepEqual(after.filters, before.filters, 'filters must not change on a rejected patch');
}
```

| Test | Body sent |
|---|---|
| missing `expectedVersion` | `{ filters: { category: 'Books' } }` |
| non-integer version | `{ expectedVersion: 1.5, filters: {...} }` |
| **missing `filters`** (the old fallback) | `{ expectedVersion: 1 }` + additionally: `expectedVersion` must not appear in the filters |
| unknown key | `{ filters: { color: 'red' } }` |
| price as text | `{ filters: { priceMax: '450' } }` |
| negative price | `{ filters: { priceMax: -50 } }` |
| filters as an array | `{ filters: ['category'] }` |

---

## B4. `test/api-concurrency.test.js` (4 tests: versions and 409)

```js
// 1. The incident scenario, sequentially (deterministically):
const read = store.get('cheap-laptops');                                        // A and B read v1
const a = await patch(base, { expectedVersion: read.version, filters: { category: 'Books' } });
assert.equal(a.status, 200);                                                    // A saves -> v2
const b = await patch(base, { expectedVersion: read.version, filters: { priceMax: 300 } });
assert.equal(b.status, 409);                                                    // B with stale v1 -> 409
assert.equal(b.body.search.version, read.version + 1);                          // the 409 carries the current state
assert.equal(after.filters.priceMax, 500, "B's rejected edit must not have applied");   // B's change did NOT go in

// 2. Matching version -> 200, version +1 exactly

// 3. Two requests in parallel (Promise.all) with the same version:
assert.deepEqual([a.status, b.status].sort(), [200, 409]);   // one wins, one 409
assert.equal(after.version, before.version + 1);             // version bumped once
assert.equal(after.filters.category, winner.body.filters.category);   // the winner's value is stored

// 4. Unknown id -> 404
```

---

## B5. `test/client-serializer.test.js` (10 serializer tests)

| Test | Input | Expected result |
|---|---|---|
| one field | `{ dateTo: '2026-06-20' }` | exactly `{ dateTo: '2026-06-20' }` |
| explicit clear | `{ priceMax: null }` | `{ priceMax: null }` |
| undefined | `{ category: undefined, query: 'laptops' }` | `{ query: 'laptops' }` |
| empty | `{}` | `{}` |
| unknown key | `{ color: 'red' }` | exception |
| NaN | `{ priceMax: NaN }` | exception |
| Infinity | `{ priceMax: Infinity }` | exception |
| negative | `{ priceMax: -1 }` | exception |
| zero | `{ priceMax: 0 }` | `{ priceMax: 0 }` (0 is a valid price!) |
| no foreign keys | `{ query, dateTo }` | only those 2 keys |

---

## B6. `test/client-edits.test.js` (16 diff tests)

Original: `{ query: 'laptops', category: 'Electronics', dateFrom: '2026-06-01', dateTo: '2026-06-15', priceMax: 500 }`

| Test | Form | Expected |
|---|---|---|
| untouched | same as original | `edits = {}`, `errors = {}` |
| date change | `dateTo: '2026-06-20'` | `{ dateTo: '2026-06-20' }` |
| price from text | `priceMax: '450'` | `450` as a **number** |
| same price as text | `priceMax: '500'` | no change |
| cents | `priceMax: '499.99'` | `499.99` |
| hex / exponent / negative / garbage | `'0x1F4'`, `'1e3'`, `'-50'`, `'12abc'` | error, no `priceMax` in edits (4 tests in a loop) |
| text | `priceMax: 'abc'` | error |
| whitespace only | `priceMax: '   '` | `null` (clear), **not** `0` |
| empty, was empty | `priceMax: ''`, original without a price | no change |
| null, was empty | `priceMax: null`, original without a price | no change |
| an error does not drop other changes | `priceMax: 'abc'`, `dateTo: '...'` | `edits = { dateTo }` + a price error |
| clearing text | `category: ''` | `{ category: null }` |
| key missing from the form | no `category` | `{ category: null }` |

---

## B7. `test/client-flow.test.js` (5 flow tests over HTTP)

Calls the **real** `submitSavedSearchEdit` (the same code the editor uses) against a real server.

```js
// 1. Changing only the date through the FULL form -> the other filters untouched
const form = { ...original.filters, dateTo: '2026-06-20' };
const result = await submitSavedSearchEdit(base, ID, original, form);
assert.equal(result.kind, 'saved');

// 2. Empty text in the price -> only priceMax disappears

// 3. Untouched form -> 'unchanged' and the server version unchanged (the request did not go out)

// 4. KEY TEST: bad price + VALID date -> 'invalid' and the server unchanged.
//    The valid date is deliberate: if the errors guard disappeared, the date would
//    reach the server, the version would go up, and the test would fail.
const form = { ...original.filters, priceMax: 'abc', dateTo: '2026-06-20' };
assert.equal(result.kind, 'invalid');
assert.equal(after.version, original.version);

// 5. Two editors: A saves, B (without reloading) -> 'conflict',
//    A's change survived, B's change did not go in
```

---

## B8. `test/run-regression.js` (the regression gate)

```js
const { runScenarios } = require('./regression.test');
const src = require('../src/app');
const srcSerializer = require('../src/client/buildSavedSearchPatch');
const referenceDefect = require('./reference_defect');

(async () => {
  // 1. On OUR code - everything must pass
  const fixedResults = await runScenarios({
    createApp: src.createApp,
    buildSavedSearchPatch: srcSerializer.buildSavedSearchPatch,
  });

  // 2. On the FROZEN original - must fail (proof the test would detect the incident)
  const defectResults = await runScenarios({
    createApp: referenceDefect.createApp,
    buildSavedSearchPatch: referenceDefect.buildSavedSearchPatch,
  });

  // Prints the result of every scenario for both versions (you can see the REASON for a failure).
  // Exits with an error if check(src) !== true OR check(reference) !== false.
  // So it fails both when the code is broken and when the test is broken (e.g. always true).
  process.exit(srcOk && defectOk ? 0 : 1);
})();
```

---

# PART C: DOCUMENTATION (briefly)

**`docs/api-contract.md`**: the original three-case table is kept. Added sections: validation (required `expectedVersion` and `filters`, allowed keys, types, whole-request validation before writing, an empty `filters` bumps the version), the 409 response body, "Client responsibilities" (send only changes, send the last loaded version, never auto-retry a 409, reject NaN before serializing, because JSON turns it into `null`).

**`README.md`**: the `npm test` and `verify` description updated, the file list extended with the new files, the "(defective)" labels removed.

**`AI_WORKFLOW.md`**: the completed template (files 03-09).

**`docs/ai-session-transcript.md`** (new): the full transcript of the Claude Code session.
