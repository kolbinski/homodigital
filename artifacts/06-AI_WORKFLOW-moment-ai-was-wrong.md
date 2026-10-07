# 06. The "The moment the AI was wrong" chapter

This is **the most important chapter** for Toptal. The template says explicitly that they want a moment from **your** workflow, not the example from `docs/ai-recommendation.md`. Your story: **a test that could not fail**.

---

## What AI_WORKFLOW.md says

**A test that could not fail.** Claude Code wrote a case in `test/client-flow.test.js` named "invalid priceMax 'abc' sends no request and leaves the server unchanged". The test called `computeSavedSearchEdits`, checked that an error was reported, and then checked that the version and filters on the server had not changed. **It never called anything that could send a request**, so of course the server did not change. A comment claimed: "onSave's contract: a non-empty errors object means saveEdit is never called", describing JSX the test never ran. Removing the guard from the editor would have left the test green. It is the same mechanism as INC-702 itself: green tests that do not check what their name promises.

**How it was found:** by reading the body of the test and comparing it with its name, instead of accepting the green result.

**Cause and fix:** the save decision lived in JSX, which cannot run without a bundler. It was moved into `submitSavedSearchEdit.js`. The test now calls the real decision code with `priceMax: "abc"` **plus a valid `dateTo` change**, so if the guard were removed, the `dateTo` change would reach the server and the test would fail.

**How the fix was validated:** mutation testing (table below).

---

## Plain explanation

### What the bad test looked like (simplified)

```js
test('invalid priceMax "abc" sends no request and leaves the server unchanged', async () => {
  const original = await getSavedSearch(base, ID);
  const form = { ...original.filters, priceMax: 'abc' };
  const { errors } = computeSavedSearchEdits(original.filters, form);
  assert.equal(typeof errors.priceMax, 'string');      // OK, the function reported an error

  // onSave's contract: a non-empty errors object means saveEdit is never called.
  const after = store.get(ID);
  assert.equal(after.version, original.version);       // always true!
});
```

Analogy: you want to check whether the alarm goes off during a break-in. The test goes: "check that the sensor detected motion, then check that nothing was stolen from the house". But nobody tried to break in. Of course nothing was stolen. The test does not check the alarm, only that nobody came.

Concretely: the test only calls the function that computes the difference. It calls nothing that sends a request. So the assertion "the server did not change" is **always** true, regardless of whether the guard exists.

### Why it was treacherous

- it had a **good, descriptive name**,
- it had **assertions** that look sensible,
- it had a **comment** that sounds convincing,
- it **passed**.

Every signal said "good test". Only reading the test body against its name showed it does not check what it promises.

### Why this connects to INC-702

Toptal's `test/given.test.js` has the same problem: the test "a full-form save updates a field" passes because it sends the full form, so it cannot reproduce the incident. The AI repeated **exactly the failure pattern** the task asks you to fix. That is a strong point in the interview.

### The deeper cause: logic in the wrong place

The problem was not in the test itself, but in the architecture. The decision "errors → don't send" lived in `SavedSearchEditor.jsx`. JSX does not run in Node without a bundler, and adding a bundler is not allowed. So it was **impossible** to write an honest test of that decision. The AI wrote a test that pretended to check it.

### The fix

1. A new module `submitSavedSearchEdit.js` holds the whole decision, without JSX:
```js
if (Object.keys(errors).length > 0) return { kind: 'invalid', errors };   // guard
if (Object.keys(edits).length === 0) return { kind: 'unchanged' };
const { status, body } = await saveEdit(...);                            // network only here
```
2. The editor only calls this module and shows the result.
3. The new test:
```js
const form = { ...original.filters, priceMax: 'abc', dateTo: '2026-06-20' };   // BAD + GOOD field
const result = await submitSavedSearchEdit(base, ID, original, form);
assert.equal(result.kind, 'invalid');
assert.equal(store.get(ID).version, original.version);       // now this means something
```

**Why the extra valid `dateTo` field?** This is the clever part. If the guard disappeared, the function would send the valid `dateTo` change (because the invalid `priceMax` does not go into `edits` anyway), the server would store it, the version would go up, and the test would fail on the server-state assertion. Without `dateTo` the diff would be empty and the function would return `unchanged`, sending nothing. A missing guard would then be caught only by the `kind === 'invalid'` assertion, and the "server did not change" assertion would again be always true. Thanks to `dateTo` the test checks a **real effect**: that the request really did not go out.

### Mutation testing: proof that the test works

**What is mutation testing?** You deliberately break the code (introduce a "mutation") and check whether the tests detect it. If the tests stay green after the code is broken, they are worthless at that spot. We say the mutant "survived".

| Mutation (deliberate break) | Result |
|---|---|
| errors guard removed | the "invalid blocks" test fails |
| empty-diff guard removed | the "unchanged" test fails |
| diff sends every text field | the "unchanged" test fails |
| silent auto-retry on 409 with the new version | the 409 test fails |

An important detail worth saying: Claude Code claimed it had checked the mutation, but **did not show the output**. That is why the mutations were re-run independently. Later we re-ran them once more on the final repo.

### Bonus: the NaN "near-miss"

The path NaN → `null` → silent delete appeared twice: in the first plan (`Number("abc")` sent as `null` would remove the price cap) and in the documentation. The same class of bug as the incident.

---

## How to tell it in the interview (about 2 minutes)

> "The most interesting AI mistake was a test that could not fail. It was called 'invalid priceMax sends no request', had assertions, and passed. But it never called anything that sends a request, so the assertion 'the server did not change' was always true.
>
> It is the same mechanism as the incident itself: the supplied test was green because it sent the full form and could not reproduce the bug.
>
> The cause was architectural. The save decision lived in JSX, which can't run without a bundler. I moved it into a pure module and rewrote the test so it sends an invalid price together with a valid date. If the guard disappears, the date reaches the server and the test fails.
>
> I proved it with a mutation: I removed the guard, the test failed, I restored it."

---

## Questions you may be asked

**"How did you notice?"**
> "By reading the test body against its name. I asked: what would have to break for this test to fail? And the answer was: nothing. That is the simplest test of a test's value."

**"Why not just add a bundler and a component test?"**
> "The brief forbids a build tool. Moving the logic into a pure module is a better design anyway: the component is responsible for display, the module for decisions. Before production I would add a component test, e.g. React Testing Library, to test the wiring as well."

**"Why not the example from ai-recommendation.md?"**
> "Because the template asks for a moment from my workflow. The OpenAPI recommendation is a planted example. Yes, I rejected it, because types guard shape, not the absent-key vs `null` semantics. But the more interesting one was the mistake the AI made during my own work."

**"What is mutation testing?"**
> "I deliberately break production code in a specific place and check whether the tests notice. If they don't, the test is worthless at that spot. I did it by hand because the task forbids dependencies, but in a larger project I would use a tool such as Stryker."
