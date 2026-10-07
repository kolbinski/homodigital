# 01. The inherited project: what it did before we touched it

This document describes the project **exactly as it arrived from Toptal** (commit `dc3f22e`). You can view the original of any file with:

```
git show dc3f22e:path/to/file
```

---

## 1. What this app is (in plain words)

Imagine an online shop with laptops. The user sets filters: search "laptops", category "Electronics", dates from-to, price at most 500. To avoid clicking this every day, they **save that set of filters under a name**, e.g. "Cheap laptops". That is a **saved search**.

Later the user wants to change one filter, e.g. move the end date. They open the edit form, change the date, click "Save".

A saved search can be **shared**, so two people on a team can edit it at the same time.

## 2. Business requirements

From `docs/incident.md` and `TASK_BRIEF.md` there are four requirements:

1. **An edit changes only what the user changed.** I change the date, so the category, price and the rest stay. (Criterion **B1**.)
2. **An explicit clear removes only that one filter.** I click "Clear price cap", so only the price cap disappears. (Criterion **B2**.)
3. **Two people must not silently overwrite each other's changes.** If someone saved before me, my save must be rejected with **409**, not silently overwrite their changes. (Criterion **B3**.)
4. A sentence from the incident worth quoting: *"an edit changes what the user changed and nothing else"*.

## 3. Architecture: how data flows

```
 BROWSER                                              SERVER (Node)
┌──────────────────────────┐                 ┌───────────────────────────┐
│ SavedSearchEditor.jsx     │                 │ src/app.js                 │
│  (React form)             │                 │  (HTTP: GET / PATCH)       │
│        │ onSave           │                 │        │                   │
│        ▼                  │   PATCH /api/   │        ▼                   │
│ apiClient.js  saveEdit()  │ ──────────────► │ savedSearchStore.js        │
│        │                  │  saved-searches │  (in-memory data)          │
│        ▼                  │    /:id         │                            │
│ buildSavedSearchPatch.js  │ ◄────────────── │                            │
│  (what to send)           │   JSON response │                            │
└──────────────────────────┘                 └───────────────────────────┘
```

The most important thing in the whole task: **the boundary between the client and the API**. The client must send exactly what is needed, and the API must understand it exactly that way. A bug on either side breaks the whole thing.

## 4. Key concepts you must understand

**PATCH vs PUT.** `PUT` means "replace the whole object with what I send". `PATCH` means "change only what I send". Here we use `PATCH`, so we send only changes.

**Three cases in PATCH** (the most important table of the task, from `docs/api-contract.md`):

| In the request | Meaning |
|---|---|
| key with a value, e.g. `"dateTo": "2026-06-20"` | set this filter |
| key with `null`, e.g. `"priceMax": null` | remove this one filter |
| **key absent** | leave this filter alone |

An absent key and `null` are **two different things**. The whole INC-702 bug comes from mixing up these two cases.

**Version (`version`).** Every saved search has a version number. It starts at 1 and every successful write increments it by 1.

**Optimistic concurrency.** On save, the client says: "I edited version 3" (`expectedVersion: 3`). The server checks: if it is version 3 now, it writes and makes it 4. If it is already 4 (someone saved in between), it rejects with **409 Conflict**. "Optimistic" because we do not lock anyone out of editing up front, we only check for a conflict at the moment of writing.

**Lost update.** A and B read version 1. A saves. B saves their version, and A's change disappears without a trace. That is the second report in the incident.

---

## 5. Every file described

### Root files

**`README.md`.** Short description: React + Node, no dependencies, Node 18+. Two commands: `npm test` ("green, and misleading") and `npm run verify` (0/3 at the start). A file list marking which ones are defective.

**`TASK_BRIEF.md`.** The task: three criteria B1, B2, B3, the regression test requirement, prohibitions (no auth, no new framework, no unrelated features), what to submit.

**`CROSS-STACK-SPEC.md`.** The same API contract described independently of language. Explains that `additional-backend-tasks/` is reference material in other languages only, not separate tasks.

**`package.json`.** No dependencies. Two scripts:
```json
"scripts": { "test": "node test/given.test.js", "verify": "node scripts/verify.js" }
```

**`AI_WORKFLOW.md`.** An empty template with seven sections to fill in.

### The `docs/` folder

**`docs/incident.md`.** Report INC-702. Reproduction steps: open "Cheap laptops", change only the end date, save, reload, and the category, price and the rest are gone. Second report: two people edit at the same time and one person's change disappears without an error.

**`docs/api-contract.md`.** The contract, i.e. the agreement between client and server: request format `{ expectedVersion, filters }`, the three-case table, the 409 rule. **The original code broke this contract in several places.**

**`docs/ai-recommendation.md`.** A deliberately planted, wrong piece of advice from a "previous AI": "regenerate the types from OpenAPI and the bug will go away". It is a trap: types check the **shape** of data (is `priceMax` a number or `null`), not the **meaning** (should there be a `null` here, or should the key be absent). `{ priceMax: null }` is type-correct in both cases.

### The `src/` folder (application code)

#### `src/server/savedSearchStore.js`: the data store

Keeps **one** saved search in memory (no database):

```js
function initial() {
  return {
    id: 'cheap-laptops', name: 'Cheap laptops', version: 1,
    filters: { query: 'laptops', category: 'Electronics',
               dateFrom: '2026-06-01', dateTo: '2026-06-15', priceMax: 500 },
  };
}
```

Methods:
- `get(id)` returns a copy of the search or `null`.
- `patch(id, patch)` merges the changes:

```js
patch(id, patch) {
  if (id !== search.id) return null;
  const filters = { ...search.filters };          // copy of the current filters
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete filters[key];       // null = delete
    else filters[key] = value;                     // value = set
  }                                                // absent key = do nothing
  search = { ...search, filters, version: search.version + 1 };
  return structuredClone(search);
}
```

What is **right** here: the three-case semantics are implemented correctly. What is **wrong**: no version parameter and no check at all, so every write goes through.

`structuredClone` makes a deep copy of the object, so nobody outside can change the store's data through a reference.

`_reset()` restores the initial state (a helper for tests).

#### `src/app.js`: the HTTP server

Uses the built-in `node:http` module, no Express. Handles two endpoints:
- `GET /api/saved-searches/:id` → 200 with the search or 404,
- `PATCH /api/saved-searches/:id` → write.

The key part of the original:

```js
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

The comment itself admits it: no version check and no validation. On top of that, `body.filters || body` means "if there is no `filters`, treat the **whole body** as filters".

Other functions:
- `readJson(request)` collects body chunks and parses JSON (bad JSON → exception → 400),
- `sendJson(response, status, value)` sends a JSON response,
- `server._store = store` exposes the store so tests can look at the data.

#### `src/client/buildSavedSearchPatch.js`: the client serializer

Turns what the client is about to send into the `filters` object for PATCH:

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

The `??` operator (nullish coalescing) means: "if the left side is `null` or `undefined`, take the right side". So: **every key that is not in the input becomes `null`**, and `null` in the contract means "delete". This is the heart of the incident (details in file 02).

#### `src/client/apiClient.js`: the HTTP client

```js
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

It sends **only the filters**, without the `{ expectedVersion, filters }` wrapper and without a version. It works only thanks to the `body.filters || body` fallback on the server.

`getSavedSearch(baseUrl, id)` does a plain GET and throws on error.

#### `src/client/SavedSearchEditor.jsx`: the React form

- On start it loads the search and puts **all** filters into the form state: `setForm({ ...s.filters })`.
- Every field change: `set(key, value)`, and an empty string becomes `null`.
- The "Clear price cap" button sets `priceMax` to `null`.
- Saving:

```js
async function onSave() {
  const { status: code, body } = await saveEdit(baseUrl, id, form);   // the whole form!
  if (code === 200) { setSearch(body); setForm({ ...body.filters }); setStatus('Saved.'); }
  else if (code === 409) setStatus('Someone else changed this search. Reload and reapply your edit.');
  else setStatus(`Could not save (${code}): ${body.error || 'error'}`);
}
```

Fun fact: 409 handling **exists**, but can never fire, because the server never returns 409.

#### `public/index.html`

An empty page with a comment: React would be mounted here through a bundler, but the task grades the client/API contract, so building the frontend in a browser is not required. **That is why no test runs the JSX** - there is no bundler, and the task forbids adding one.

### The `test/` and `scripts/` folders

**`test/given.test.js`.** Two tests supplied by Toptal:
1. GET returns the search with category "Electronics".
2. "a full-form save updates a field": sends **all five filters with values**, changes only the date.

Test 2 passes because when you provide every field, the serializer has nothing to turn into `null`. The test's own comment admits it: *"which is exactly why it fails to reveal the incident"*. It is a **deliberately misleading test**: green, but it bypasses the incident scenario. It also uses `require('node:assert')`, i.e. loose comparisons (more in file 02).

**`test/reference_defect.js`.** A **frozen copy** of the original server and serializer in a single file. **Must not be edited.** It is used to prove your regression test would detect the original bug: the test must pass on your code and fail on this copy.

**`test/regression.test.js`.** A skeleton to fill in:
```js
async function check({ createApp, buildSavedSearchPatch }) {
  // TODO: replace with a real check.
  return false;
}
```
The function receives `createApp` and `buildSavedSearchPatch` from outside, so the same test can run on your code or on `reference_defect.js`.

**`scripts/verify.js`.** **The acceptance gate, must not be edited.** It starts a real server on a random port (`listen(0)`, an ephemeral port) and checks:
- **B1:** `buildSavedSearchPatch({ dateTo: '2026-06-20' })` - calls the serializer **with only the changed field**, sends it with the version, and checks that the other 4 filters survived.
- **B2:** `buildSavedSearchPatch({ priceMax: null })` and checks that only `priceMax` disappeared.
- **B3:** two parallel PATCHes with the same version (`Promise.all`), expects one 200 and one 409, and the version incremented exactly once.

Important: `verify` calls the serializer with **only the changes** (edits), not with the whole form. That tells you the expected contract of `buildSavedSearchPatch`.

### `additional-backend-tasks/`

The same backend in .NET, Java, PHP/Laravel, Python/FastAPI and Rails. Reference only; we did not touch it.

---

## 6. Let's trace one save in the original code

The user changes only `dateTo` and clicks Save.

1. The editor has the whole form in state: `{ query, category, dateFrom, dateTo: '2026-06-20', priceMax: 500 }`.
2. `saveEdit(baseUrl, id, form)` → `buildSavedSearchPatch(form)` → all 5 keys with values.
3. It sends `{"query":"laptops", ... ,"dateTo":"2026-06-20","priceMax":500}`, with no version.
4. Server: `body.filters` does not exist, so it takes the whole body as the patch, merges, and bumps the version.

In this particular flow nothing was lost, because the editor sent the whole form. **But:**
- anyone who calls the serializer the way the contract intends and the way `verify` does, i.e. **with only the change**, wipes the other four filters,
- the editor silently sends back **old values of fields the user never touched**. If someone else changed the category in the meantime, this save reverts it. That is exactly the lost update from the second report.

The full analysis of every bug is in `02-bugs-and-fixes.md`.
