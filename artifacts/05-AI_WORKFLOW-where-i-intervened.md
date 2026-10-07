# 05. The "Where I intervened, edited, or rejected the AI's output" chapter

This chapter shows **concrete** interventions. Toptal asks explicitly: "a concrete diff or decision, not 'I reviewed everything'". You have ten. In the interview pick the 2-3 strongest (marked ⭐).

---

## 1. The `body.filters || body` fallback is a bug, not "missing validation"

**What the AI did:** in its first plan it classified `body.filters || body` as "missing validation".

**Why that is not enough:** it is an active bug that writes garbage. A body `{ expectedVersion: 3 }` without `filters` would be stored as a filter named `expectedVersion`.

**What we did:** removed the fallback entirely and added a test checking 400 **and** that `expectedVersion` did not appear in the filters.

**Lesson:** "add validation" and "remove the buggy code" are two different fixes. Validation next to the fallback would still leave a loophole.

## 2. `expectedVersion` must be required ⭐

**What the AI did:** the plan did not decide whether the version was mandatory.

**Why it matters:** if the version is optional, any client that does not send it (old, broken, written by someone else) bypasses the protection. B3 would be fixed only "cosmetically": the test passes because the test sends a version, while the real risk remains.

**What we did:** missing or non-integer version → 400.

**How to say it:** "Optional concurrency control is no concurrency control."

## 3. Commit order, so that each one is green

**What the AI did:** the plan claimed every commit leaves the system coherent, but:
- commit 1 (required version) broke `given.test.js` (it sends PATCH without a version) until commit 2,
- commit 5 changed the `saveEdit` signature, while the editor called the old one until commit 7.

**What we did:** merged commits 1+2 and 5+7.

**Lesson:** an AI can write a sentence ("each commit stays coherent") that contradicts its own plan. You have to check the plan, not just its summary.

## 4. "Green verify, live bug" ⭐

**What the AI did:** the plan assumed the serializer fix solves B1/B2.

**Why that is not enough:** `verify` calls the serializer **directly, with only the change**. The editor kept passing the whole form. After only the serializer fix `verify` showed 3/3, while the UI still did the wrong thing.

**What we did:** moved the "form → changes" logic out of the JSX into a pure function (`computeSavedSearchEdits`), and then the save decision into `submitSavedSearchEdit`, so it can be tested without a bundler.

**How to say it:** "The acceptance gate measures the serializer's contract, not the user's flow. I treated `verify` as necessary, not sufficient."

## 5. The "stale version" test used a version that never existed

**What the AI did:** the test sent `expectedVersion = version - 1`, i.e. `0`, while the search starts at 1.

**Why that is weak:** it checks an "unknown version", not a "stale version". An implementation accepting `expectedVersion <= version` would pass this test while breaking the incident scenario.

**What we did:** the test reproduces the incident scenario sequentially: A and B read v1, A saves (v2), B saves with v1 → 409, B's change was not applied, `priceMax` still 500.

**Bonus:** the sequential test is **deterministic**, while `Promise.all` depends on the order in the event loop. We have both.

## 6. Loose assertions (`node:assert`) ⭐

**What the AI did:** every test used `require('node:assert')`, copied from the pattern in Toptal's `given.test.js`.

**Why it is dangerous:**
```js
assert.deepEqual({ priceMax: undefined }, { priceMax: null })  // passes!
assert.equal(500, '500')                                         // passes!
```
In a task whose core is the difference between `null` and absent, the "explicit null is preserved" test would pass even if the serializer sent `undefined`.

**What we did:** `node:assert/strict` in all our tests, in a separate commit. Nothing failed after the switch. Honestly: it is a safety net, not a fix for a hidden bug.

**Lesson:** AI copies patterns from existing code, bad ones included.

## 7. A too-permissive `priceMax` parser

**What the AI did:** `Number(String(value).trim())`.

**How it was found:** not by reading the code, but by **probing with odd inputs** (`"0x1F4"`, `"1e3"`, `"-50"`, `"0b111110100"`). All of them came through as numbers.

**What we did:** a format whitelist `/^\d+(\.\d{1,2})?$/`, and the server rejects negative numbers.

**Lesson:** for human input an explicit whitelist beats "whatever `Number()` accepts".

## 8. Async problems in the editor

**What the AI did:** an editor with no save lock and no load error handling.

**Problems:**
- double click → a second request with the same version → a false 409 about your own save,
- text typed during a save wiped after the response,
- network error → endless "Loading…".

**What we did:** a `saving` state that disables every control, `.catch` in `load()`.

**Lesson:** unit tests do not see timing and event-order problems. You have to think about them separately.

## 9. The documentation promised something impossible ⭐

**What the AI did:** in `api-contract.md` it wrote: "NaN, Infinity → 400".

**Why that is false:** JSON has no `NaN`. `JSON.stringify({ priceMax: NaN })` gives `{"priceMax":null}`, and the server responds 200 and **removes** the price cap.

**Why it is dangerous:** someone who trusts the documentation will skip client-side validation, because "the server will catch it". And the server cannot catch it.

**What we did:** corrected the document + a "Client responsibilities" section + an extra guard in `buildSavedSearchPatch`.

**Lesson:** the same bug (NaN → `null` → delete) appeared **twice**, in the code plan and in the documentation. That is a systemic risk, not an accident.

## 10. Summaries instead of artifacts ⭐ (your own intervention)

**What the AI did:** several times it wrote "here are the full contents" or "confirmed, test fails", while the terminal showed only a collapsed "Read 1 file". When you typed `git show` inside the Claude Code session, the AI **summarized** the file instead of showing it.

**What you did:** you opened the file yourself in the terminal. From then on every prompt demanded raw output and full files.

**How to say it:** "An AI's claim that it checked something is not proof. I checked the artifact, not the description of the artifact."

---

## Questions you may be asked

**"Which of these bugs was the most dangerous?"**
> "NaN → `null`. It is invisible: no message, no error, the server responds 200, and the filter disappears. Exactly the same class as the incident. And it appeared twice in different places."

**"Which one surprised you the most?"**
> "The loose assertions. The test looked correct, had a good name, passed, and in practice could not tell `null` from `undefined` - exactly the difference the task is about."

**"How did you know where to look?"**
> "From the contract. The most important distinction in this task is absent key vs `null`. So every place where data changes form (form → diff → serializer → JSON → server) I checked for whether that distinction survives. NaN, loose assertions and the fallback are all places where it got lost."
