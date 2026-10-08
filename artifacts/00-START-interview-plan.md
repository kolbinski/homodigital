# 00. Start: interview plan and how to use these materials

## Reading order

| File                                    | Purpose                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `11-interview-script.md`                | [Interview script: 40-minute walkthrough.](/view.html?file=artifacts/11-interview-script.md)                          |
| `01-inherited-project.md`               | [What the app did before you touched it. Every file, one by one.](/view.html?file=artifacts/01-inherited-project.md)  |
| `02-bugs-and-fixes.md`                  | [All bugs and how we fixed them, with "before" and "after" code.](view.html?file=artifacts/02-bugs-and-fixes.md)      |
| `03-AI_WORKFLOW-tools-used.md`          | [The "Tools used" chapter - who did what.](view.html?file=artifacts/03-AI_WORKFLOW-tools-used.md)                     |
| `04-AI_WORKFLOW-what-i-asked.md`        | [The "What I asked, and what I got" chapter.](view.html?file=artifacts/04-AI_WORKFLOW-what-i-asked.md)                |
| `05-AI_WORKFLOW-where-i-intervened.md`  | [The "Where I intervened" chapter - 10 interventions.](view.html?file=artifacts/05-AI_WORKFLOW-where-i-intervened.md) |
| `06-AI_WORKFLOW-moment-ai-was-wrong.md` | [The chapter about the test that could not fail.](view.html?file=artifacts/06-AI_WORKFLOW-moment-ai-was-wrong.md)     |
| `07-AI_WORKFLOW-how-i-validated.md`     | [The validation chapter: tests, regression, mutations.](view.html?file=artifacts/07-AI_WORKFLOW-how-i-validated.md)   |
| `08-AI_WORKFLOW-not-used-ai.md`         | [The "What I deliberately did NOT use AI for" chapter.](view.html?file=artifacts/08-AI_WORKFLOW-not-used-ai.md)       |
| `09-AI_WORKFLOW-ownership-note.md`      | [Decisions, risks, what you would do differently.](view.html?file=artifacts/09-AI_WORKFLOW-ownership-note.md)         |
| `10-code-changes.md`                    | [Every code change: before and after, plus new files.](view.html?file=artifacts/10-code-changes.md)                   |

Each file from 03 to 09 ends with a **"Questions you may be asked"** section with ready answers.

---

## Your story in 60 seconds (learn it almost by heart)

> The saved-search app lost filters on edit and let two people overwrite each other's changes without warning. The cause sat in three layers at once. The client sent every filter on every save, and turned the ones it was not given into `null`, which means "delete". The editor sent the whole form instead of just the changes. And the server did not check versions at all.
>
> I fixed it like this: the client computes the difference between what it loaded and what is in the form, and sends only the changed fields together with the version it saw. The server validates the whole request and does an atomic "check version and write". On a mismatch it returns 409, and the client never retries automatically.
>
> I worked with Claude Code as the implementer and a second Claude session as the reviewer. We caught several AI mistakes. The most interesting was a test that was supposed to check that invalid data does not reach the server, but in fact could not fail. I proved correctness with tests at every layer, a regression test that passes on my version and fails on the original, and mutation testing - deliberately breaking the code to check that the tests catch it.

---

## 40-minute presentation plan

| Minutes | What you show                                                              | File to open                                                                                  |
| ------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 0-3     | The business problem (INC-702 + the second report)                         | `docs/incident.md`                                                                            |
| 3-8     | The contract: absent key / `null` / value, `expectedVersion`, 409          | `docs/api-contract.md`                                                                        |
| 8-15    | The three causes in the original code                                      | `git show dc3f22e:src/client/buildSavedSearchPatch.js`                                        |
| 15-25   | The solution layer by layer: API, store, client                            | `src/app.js`, `savedSearchStore.js`, `computeSavedSearchEdits.js`, `submitSavedSearchEdit.js` |
| 25-32   | Tests and proof: `npm test`, `npm run verify`, regression on both versions | terminal                                                                                      |
| 32-38   | AI workflow: the best "caught AI failure" + 2-3 interventions              | `AI_WORKFLOW.md`                                                                              |
| 38-40   | Residual risks and what comes next before production                       | `AI_WORKFLOW.md`, ownership note                                                              |

**Tip:** show the commit history (`git log --oneline`). It tells the story of your step-by-step work better than any slide.

---

## Preparing for "live adjustments"

The reviewer may ask for a live change to see how you work with AI. What counts is not only the result but the **process**: first understand, then give the AI a narrow instruction, then check the diff and the tests.

### Universal pattern (say it out loud before you start)

1. "First I'll check which files this touches."
2. "I'll give the AI a narrow prompt: one change, no commit, show the diff and the test output."
3. "I'll read the diff before I believe the summary."
4. "I'll add a test that fails before the change and passes after it."
5. "I'll run `npm test` and `npm run verify`."

### Most likely tasks and where the code has to change

**1. "Add a new filter, e.g. `brand`."**
Trap: the list of keys lives in **three** places:

- `src/app.js` → `FILTER_KEYS` (server validation),
- `src/client/buildSavedSearchPatch.js` → `FILTER_KEYS` (client),
- `src/client/SavedSearchEditor.jsx` → a hard-coded list in the JSX: `['query', 'category', 'dateFrom', 'dateTo', 'priceMax'].map(...)`.

Plus `initial()` in the store (if it should have a starting value), the tests and `docs/api-contract.md`. `computeSavedSearchEdits` handles a new text filter automatically, because it iterates over `FILTER_KEYS`. You can immediately suggest a small improvement: have the JSX import `FILTER_KEYS` instead of keeping its own list.

**2. "On 409, show the user what someone else changed."**
The server already returns the current state in the 409 body (`{ error: 'version_conflict', search }`), and `submitSavedSearchEdit` passes it on as `result.search`. You only need to store it in the editor's state and display it next to the form. No API change needed.

**3. "A missing `expectedVersion` should return 428 instead of 400."**
One change in `validatePatchBody` / PATCH handling in `src/app.js` + update the test in `api-validation.test.js` + the contract.

**4. "Send the version in an `If-Match` header instead of the body."**
Change `apiClient.saveEdit` (header) and `app.js` (read the header). Note: `scripts/verify.js` sends `expectedVersion` in the body and must not be changed, so you either support both, or say so to the reviewer directly.

**5. "Validate dates: format and `dateFrom <= dateTo`."**
Format validation goes in `validatePatchBody`. Watch the trap: `dateFrom <= dateTo` must be checked on the **merged state** (because a patch may contain only one of the dates), i.e. in the store, after building `nextFilters` but before writing.

**6. "Support multiple saved searches."**
Today the store keeps one search in the `search` variable. Replace it with a `Map` keyed by `id`. The versioning logic stays the same, just per object.
