# 04. The "What I asked, and what I got" chapter

## What AI_WORKFLOW.md says

1. **Diagnosis only, no code changes.** Claude Code correctly identified three defects: the client serializer (`form[key] ?? null` turns every missing key into an explicit clear), the editor sending the whole form without `expectedVersion`, and the API and store not checking the version. It also correctly rejected `docs/ai-recommendation.md` (type agreement is not agreement on absent-key vs `null` semantics, and it does nothing for concurrency).
2. **A revised plan** after your corrections.
3. **Implementation, one commit per step:** API validation; optimistic concurrency in the store; serializer fix; strict assertions; `computeSavedSearchEdits`; `submitSavedSearchEdit` + editor; regression test; contract docs; serializer hardening.

Full transcript: `docs/ai-session-transcript.md`.

## Plain explanation

### Why did you start with "diagnosis only"?

If you had written "fix the bugs" straight away, the AI would have done everything in one pass: one huge commit, no checkpoints, and the risk that it "fixes" the symptom instead of the cause. A diagnosis without code gives you:
- the chance to compare the AI's diagnosis with your own understanding,
- a record in the transcript showing your intervention,
- a plan that can be corrected **before** any code exists.

Like in medicine: diagnosis first, then treatment.

### The three stages of the conversation with AI

```
Prompt 1: read everything, DO NOT change code, diagnose, evaluate the AI recommendation, propose a plan
    ↓
You + reviewer: 9 plan corrections (e.g. the fallback is a bug, expectedVersion required, tests will break...)
    ↓
Prompt 2: revise the plan, still no code
    ↓
You + reviewer: more corrections (commit order, NaN, null vs absent, tests for the diff, no auto-retry)
    ↓
Prompts 3..N: implement ONLY the next step, show the diff and output, DO NOT commit
    ↓
review → approval → commit → push
```

### What was good in the AI's diagnosis

Claude Code hit the core: it noticed that `savedSearchStore.patch()` **on its own** implements the three-case semantics correctly. The B1/B2 bug is not in the store, but in what reaches it. That matters, because it shows a fix like "change the store to ignore nulls" would be wrong.

It also correctly assessed the OpenAPI recommendation: the type `{ priceMax?: number | null }` accepts exactly what the defective serializer sent. Types guard **shape**, not **meaning**.

### Commit list (to show in the interview)

```
bf94906 fix(api): require expectedVersion, validate PATCH body, remove filters fallback
1e257f3 fix(api): optimistic concurrency - reject stale expectedVersion with 409
80c5223 fix(client): serialize only edited keys, preserve explicit null
717e7a3 test: use strict assertions - legacy deepEqual treats null and undefined as equal
a5f5eba feat(client): computeSavedSearchEdits - diff form against loaded filters, reject invalid priceMax
c356884 fix(client): extract save decision into submitSavedSearchEdit, editor sends only changed filters with expectedVersion
87ab657 test: cross-boundary regression check - passes on src, fails on reference_defect
5e2e06a docs: update API contract - required expectedVersion, validation rules, 409 body, client responsibilities
465b8e7 fix(client): serializer rejects non-finite priceMax - JSON.stringify would turn NaN into null (a delete)
```

The order has a logic: **server first** (the trust boundary must be tight regardless of the client), **then the client**, **then the proof** (regression), **documentation last**.

## How to tell it in the interview

> "First prompt: diagnosis only, zero code. The AI correctly found the three causes, but the plan had gaps, so before a single line of code existed I sent nine corrections. Then I went step by step: the AI implements one step, shows the diff and the test output, I review, and only then commit."

## Questions you may be asked

**"Show the prompt that was most effective."**
> The mutation one: "temporarily delete the errors guard, run npm test, show me that test 3 fails, then restore the guard. Show both outputs." Instead of asking the AI "is the test good", you made it **prove** it.

**"Why the API first and not the client?"**
> "The server is the trust boundary. Even if the client is correct, other clients may not be. I wanted the server to be tight regardless of who writes to it: required version, validation, 409."

**"Why so many commits?"**
> "Each commit is one decision that can be reviewed and reverted if needed. And every commit leaves `npm test` green. We deliberately reordered things to make sure of that."
