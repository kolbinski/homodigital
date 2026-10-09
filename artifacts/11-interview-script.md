# Interview script: the long, spoken version

## Opening (about 1 minute)

Let me give you a quick map of how I'd like to walk through this.

I'm going to start with the business problem, because I think everything else only makes sense once you see what actually went wrong for the users. Then I'll show you the API contract, which turned out to be the key to the whole task. After that I'll go into the original code and show you the three places where it broke that contract. Then I'll walk through my fix, layer by layer - server first, then the client. Then I'll prove it works, with the tests and with the regression check. And at the end I'll talk about how I worked with AI on this, including the most interesting mistake the AI made, and what risks I think are still left before this could go to production.

---

## Part 1: The business problem (0-3 min)

**[Open `docs/incident.md`]**

Okay, so let's start with what the users actually reported.

The app is a saved-search feature. Think of an online shop with laptops. You set up a few filters - you're searching for "laptops", category "Electronics", a date range, and a maximum price of 500. And because you don't want to click all of that every day, you save that whole set of filters under a name, like "Cheap laptops". That's a saved search.

Now, the first report, INC-702, goes like this. A user opens "Cheap laptops", changes just one thing - the end date - and clicks save. Then they reload the page, and the category is gone, the price cap is gone, the start date is gone. The only thing left is the date they just changed. So editing one filter silently wiped out four others. From the user's point of view, that's really bad, because nothing told them anything went wrong. The save looked successful.

The second report is quieter, but it's just as serious. Saved searches can be shared within a team. So two people open the same saved search, both make a change, both click save - and one person's change just disappears. No error, no warning. Whoever saved last simply wins, and the other person's work is gone.

And there's one sentence in this incident that I think sums up the requirement really nicely: an edit should change what the user changed, and nothing else. That's basically the whole task in one line.

There's one more detail in the incident that I want you to notice, because it comes back later. It says the existing tests were green. So the tests were passing, and the product was still broken. That turned out to be the theme of the whole exercise for me - tests that look fine, but don't actually check what they claim to check.

---

## Part 2: The contract (3-8 min)

**[Open `docs/api-contract.md`, the table at the top]**

Before I looked at any code, I read the API contract.

When the client wants to update a saved search, it sends a PATCH request. And PATCH means "change only what I'm sending you", as opposed to PUT, which would mean "replace the whole thing". Inside that PATCH request there's an object called `filters`, and for every filter there are three possible situations.

The first situation: the key is there and it has a value. For example `"category": "Electronics"`. That means "set this filter to this value". Simple.

The second situation: the key is there, but the value is `null`. For example `"priceMax": null`. That means "remove this one filter". That's what happens when the user clicks something like "Clear price cap".

And the third situation, which is the tricky one: the key is simply not there at all. That means "I'm not touching this filter, leave it exactly as it is".

So the thing I want to stress here is that a missing key and a `null` value are two completely different instructions. Missing means "don't touch". `null` means "delete". If you mix those two up, you get exactly the bug from INC-702 - the client meant "don't touch the category", but it sent something the server read as "delete the category". And as you'll see in a minute, every single bug I found in this project is some place where those two meanings got mixed up.

The second part of the contract is about concurrency, and the mechanism is called optimistic concurrency control. Every saved search has a version number. It starts at 1, and every successful save increments it. When the client sends a PATCH, it also sends `expectedVersion`, which basically says "I'm editing version 3, that's the one I saw". The server compares that with what it currently has. If it's still version 3, great - it saves, and now it's version 4. But if somebody else already saved in the meantime and it's already version 4, then the server says "sorry, you're editing an outdated version" and returns a 409 Conflict, and it doesn't apply anything at all.

It's called "optimistic" because we don't lock anybody out of editing up front. We just optimistically assume there won't be a conflict, and we check at the moment of saving.

**[Scroll to `## Request validation`, around line 33, and `## Client responsibilities`, around line 68]**

I also extended this document. The original contract left a few things implicit, so I made them explicit. The version is required, not optional. Only the five known filter keys are accepted. The 409 response includes the current state of the saved search, so the client can show the user what changed. And there's a new section called "Client responsibilities", where I wrote down what the client must do - send only what changed, send the version it last read, and never automatically retry after a 409. I'll explain why that last one matters when we get to the client code.

---

## Part 3: The three causes in the original code (8-15 min)

Now let me show you the original code, the way it was shipped, and point out the three places where it broke the contract.

### Cause 1: the serializer

**[Run `git show dc3f22e:src/client/buildSavedSearchPatch.js`]**

This is the client serializer. Its job is to take what the client wants to save and turn it into the `filters` object for the PATCH request. And here's the whole problem.

```js
for (const key of FILTER_KEYS) {
  patch[key] = form[key] ?? null;
}
```

`FILTER_KEYS` is a list of all five filters - query, category, dateFrom, dateTo and priceMax. So this loop always goes over all five, no matter what you give it. And for each one it does this: `form[key] ?? null`. The double question mark is the nullish coalescing operator - it means "if the left side is null or undefined, use the right side instead". So any key that wasn't in the input becomes `null`.

So imagine you call this with just the one change the user made: `"category": "Electronics"`. What comes out is `category` with the new value, and then `null` for query, `null` for dateFrom, `null` for dateTo, and `null` for priceMax. And remember what `null` means in the contract - "delete this filter". So one date change becomes an instruction to delete four other filters. That's INC-702, right there, in one line of code.

The core issue is that this function has no way to say "I don't know about this field, leave it alone". It turns "not provided" into "delete".

### Cause 2: the editor and the API client

**[Run `git show dc3f22e:src/client/SavedSearchEditor.jsx`, line 31, and `git show dc3f22e:src/client/apiClient.js`, line 26]**

The second cause is in how the editor saves. Here's the save function in the React component:

```js
const { status: code, body } = await saveEdit(baseUrl, id, form);
```

It passes `form`, which is the entire form - all five fields with whatever values happen to be in them. Not the change the user made, the whole snapshot.

Now, interestingly, in this exact flow the serializer bug doesn't bite, because the form is full - there are no missing keys to turn into `null`. So the editor kind of hides the serializer bug by accident. But it creates a different problem. Because it resends every field, it also resends the old values of fields the user never touched. So let's say my colleague changed the category a minute ago, and I still have the old page open. I change only the price and click save. My request also carries the old category, and it silently reverts my colleague's change. That's the lost update from the second report.

And then in the API client:

```js
body: JSON.stringify(patch),
```

It sends just the filters. No `expectedVersion`, nothing. So the server doesn't even have the information it would need to detect a conflict.

### Cause 3: the server

**[Run `git show dc3f22e:src/app.js`, line 47]**

And the third cause is on the server side. Here's the PATCH handler:

```js
// As shipped: the whole body is treated as the filter patch. No version
// check, no validation of keys or values.
const search = store.patch(match[1], body.filters || body);
```

The comment is pretty honest about it - no version check, no validation. But I want to point out this `body.filters || body` part, because it's sneakier than it looks. It means "if there's a `filters` field, use it, and if not, treat the whole request body as the filters". So imagine a client sends `{ "expectedVersion": 3 }` and forgets the filters. The server would happily save a filter literally called `expectedVersion` with the value 3. That's garbage going straight into the data.

And here's one more thing I want to show you, because I think it's important for understanding the fix. Let me open the original store.

**[Run `git show dc3f22e:src/server/savedSearchStore.js`]**

If you look at the merge logic here - `null` deletes the key, a value sets it, and a missing key is simply skipped - that's actually correct. The store understood the three cases perfectly from day one. So the filter-loss bug was never in the store. It was in what the client was sending to the store. I mention this because a very tempting "fix" would be to change the store so that it ignores `null` values. That would make B1 pass, but then you could never clear a filter anymore, so you'd break B2. You'd be fixing the symptom in the wrong layer.

So to sum up the diagnosis: the client turned "don't touch" into "delete", the editor resent fields it shouldn't have and never sent a version, and the server didn't check versions or validate anything. Three layers, three problems, and you had to fix all three.

### (Optionally) The prior AI recommendation (`docs/ai-recommendation.md`)

**[Open `docs/ai-recommendation.md`]**

Before I move on to the fix, there's one more file I want to show you, because I think it was put there on purpose, as a little test. It's called `ai-recommendation.md`, and it contains advice from a "previous AI" that supposedly looked at this bug before me.

The advice says, more or less: the client and server types are already aligned, so just regenerate the client types from the OpenAPI schema, and the filter-loss bug will resolve itself, because matching types guarantee the payloads agree.

And I have to say, it sounds very convincing. It's confident, it uses the right vocabulary, and regenerating types from a schema is a genuinely good practice in general. But for this particular bug, it's simply wrong, and I want to explain why, because I think the reason is the most important idea in the whole task.

Types check the shape of the data. They don't check its meaning. Let's think about what the generated type for the filters would look like. It would be something like: `priceMax` is optional, and it can be a number or `null`. Now look at what the broken serializer was actually sending - `priceMax: null` for a field the user never touched. Is that a valid value for that type? Yes, it is. `null` is explicitly allowed. So the type checker would look at the broken request and say "perfect, everything matches". It has no way of knowing that this `null` should actually have been a missing key.

In other words, the difference between "absent" and `null` - which is the whole bug - is a difference in meaning, not in shape. Both are perfectly legal according to the type. So you could regenerate the types a hundred times, and that loop with `?? null` in the serializer would still be there, still turning "don't touch" into "delete".

And on top of that, the advice doesn't say anything at all about the second report - the lost update. Concurrency isn't a typing problem. No type in the world can tell you that someone else saved a newer version a second ago. That needs a version check at runtime.

There's also a practical point: generating types from OpenAPI would mean adding a code generator, and probably a build step and a new dependency, which the task explicitly says not to do.

What I find interesting is that the file itself ends with a little hint: it says to evaluate this before relying on it, because type agreement is not the same as agreement on update semantics. So it's basically a test of whether you follow confident-sounding AI advice, or whether you check it against the actual problem first. And for me that was a nice preview of the whole AI part of this task - the AI can sound completely right and still be fixing the wrong thing.

By the way, Claude Code reached the same conclusion in my very first prompt, where I asked it only for a diagnosis, without changing any code. I asked it explicitly to evaluate this recommendation, and it rejected it for the same reason - types guard shape, not semantics. But I didn't use this file as my main example of an AI mistake, because the template asks for a moment from my own workflow, and this one was planted in the repository on purpose. I'll show you the real one later.

---

## Part 4: The fix, layer by layer (15-25 min)

Now the fix, layer by layer. I made a deliberate choice to fix the server first. The reasoning is that the server is the trust boundary. Even if I make my client perfect, there might be other clients - an older version of the app, a mobile app, a script someone writes. The server has to be safe no matter who is talking to it. So I made the server strict first, and then I fixed the client to play by the rules.

### The server: validation

**[Open `src/app.js`, lines 17-45]**

Let's start with validation. At the top of the file you can see a list of the allowed filter keys, and then a function called `validatePatchBody`. Its job is to look at the whole request and decide whether it's acceptable, before we change anything.

```js
if (!Number.isInteger(body.expectedVersion))
  return 'expectedVersion is required and must be an integer';
```

The version is required. You might ask, why not make it optional, for backwards compatibility? And the answer is that optional concurrency control is basically no concurrency control. If the version were optional, any client that just doesn't send it would skip the check entirely, and we'd be back to lost updates. The automated test would pass, because the test sends a version, but the real risk would still be there. So I wanted that to be impossible.

The next rule is that `filters` is required and must be a plain object. That's what replaces the `body.filters || body` fallback - there's no fallback anymore, if you don't send filters, you get a 400. Then for each key, it checks that the key is one of the five known ones, so nothing foreign can get into the data. And it checks types - the price has to be a real number, zero or more, or `null`, and the other filters have to be strings or `null`.

And one important design decision here: the whole request is validated before anything is applied. So if you send four valid filters and one invalid one, nothing gets saved. You never end up with half of a change applied.

**[Scroll to lines 71-77]**

Then the handler itself is pretty simple now. It validates first, and if something's wrong it returns 400. Then it calls the store with the version and the filters, and it maps the result to an HTTP status. Success is 200. A conflict is 409, and the 409 response also includes the current state of the saved search, so the client can show the user what the latest version looks like. And an unknown id is 404.

### The server: the atomic version check

**[Open `src/server/savedSearchStore.js`, lines 50-63]**

Now the store. The `patch` function now takes the expected version as a parameter.

```js
if (expectedVersion !== search.version) {
  return { ok: false, reason: 'conflict', search: structuredClone(search) };
}
```

So it compares the version the client saw with the version we actually have. If they're different, it returns a conflict, and it doesn't change anything. Notice it returns a copy of the current state using `structuredClone`, so nobody outside the store can accidentally modify the internal data through that reference.

If the versions match, it does the same merge as before - that part I didn't touch, because it was already correct - and then it increments the version.

> Optionally: Now here's the part I really want to explain, because it's subtle. This whole function is synchronous. There's no `await` anywhere inside it. Why does that matter? Because Node.js runs JavaScript on a single thread. When a synchronous function starts, it runs all the way to the end without being interrupted. So between the moment we check the version and the moment we write the new data, there's no way for another request to sneak in. That's what makes the check-and-write atomic. If I had put an `await` between the check and the write - for example, if I were calling a database asynchronously - then two requests could both check the version, both see version 1, both pass, and both write. And we'd have the lost update again. So in this in-memory setup, keeping it synchronous is what keeps it safe. With a real database, you'd get the same guarantee by doing a conditional update - `UPDATE ... WHERE id = ? AND version = ?` - and then checking whether any row was actually changed. I'll come back to that at the end.

### The client: computing what actually changed

**[Open `src/client/computeSavedSearchEdits.js`, lines 31-62]**

Now let's move to the client. This is a new file, and it does one job: it compares the form with the filters we originally loaded from the server, and it figures out what the user actually changed.

```js
if (formEmpty) {
  if (!originalEmpty) edits[key] = null;
  continue;
}
if (originalEmpty || formValue !== originalValue) edits[key] = formValue;
```

Let me walk through this logic, because it's really the heart of the client fix. For each filter, we look at two things: what was there originally, and what's in the form now.

If the form field is empty and the original had a value, that means the user cleared it. So we send `null` - "delete this filter".

If the form field is empty and the original was empty too, nothing changed, so we don't send anything for that key.

If the form field has a value and it's different from the original, the user changed it, so we send the new value.

And if it's the same as the original, we don't send it at all. That's the important part - untouched fields are simply absent from the request, which means "don't touch".

**[Scroll to line 23]**

```js
const PRICE_MAX_PATTERN = /^\d+(\.\d{1,2})?$/;
```

The price field needed special attention. HTML inputs always give you text, so if the user types 450, we get the string "450", and we have to turn it into a number. The obvious way would be to use JavaScript's `Number()` function. But it turns out `Number()` is way too permissive for user input. If you give it "0x1F4", it reads it as hexadecimal and gives you 500. "1e3" becomes 1000. "-50" is accepted. And here's the funniest one - if you give it a string with only spaces, it gives you zero. So a user who clears the price field with the space bar would accidentally set a price cap of zero.

So instead, I use an explicit pattern: digits, optionally a dot and up to two decimal places. Anything else is an error. And I check whether the field is empty before I try to parse it, so spaces mean "clear", not "zero". And if the input is invalid, it goes into an `errors` object, never into the edits we send.

### The client: the save decision

**[Open `src/client/submitSavedSearchEdit.js`, lines 19-29]**

This is the second new file, and it contains the whole logic of what happens when you click the Save button.

```js
if (Object.keys(errors).length > 0) return { kind: 'invalid', errors };
if (Object.keys(edits).length === 0) return { kind: 'unchanged' };
const { status, body } = await saveEdit(baseUrl, id, search.version, edits);
if (status === 200) return { kind: 'saved', search: body };
if (status === 409) return { kind: 'conflict', search: body && body.search };
```

First, why is this a separate file instead of being inside the React component? Because React components are written in JSX, and JSX can't run directly in Node without a bundler like Webpack or Vite. And the task explicitly says not to add a build tool. So if the logic stayed inside the component, there would be no honest way to test it. By moving it into a plain JavaScript module, I can test the real decision code with plain Node. It's also just a cleaner design - the component is responsible for showing things, and this module is responsible for deciding things.

Now let's read it. There are two guards at the top. The first one says: if there are any validation errors, stop, don't send anything. Not even the valid fields. The second one says: if nothing changed, don't send anything either. You might wonder why that matters - why not just send an empty request? The reason is that the server would accept an empty patch and still bump the version. That would invalidate the version for everyone else who's editing, for no reason at all.

Only after those two guards do we actually call the network, and we send the version that the user saw when they loaded the page. Then we translate the response into one of a few simple outcomes - saved, conflict, or error - and the component just shows the right message.

> Optionally: And there's one decision here I want to call out explicitly: when we get a 409, we do not retry automatically. It's really tempting to say "oh, we got a conflict, let's just grab the new version from the response and send the request again". But think about what that actually does. It takes the user's change, which was made while looking at old data, and forces it on top of someone else's change - without the user even knowing there was a conflict. That's exactly the lost update we're trying to prevent. So instead, the user sees a message and a Reload button, and they decide what to do.

### The client: the serializer

**[Open `src/client/buildSavedSearchPatch.js`, lines 24-35]**

And now the original serializer, fixed.

```js
function buildSavedSearchPatch(edits) {
  for (const key of Object.keys(edits)) {
```

The first thing I'd point out is the parameter name. It used to be called `form`, now it's called `edits`. And that one rename basically describes the whole fix. The function no longer takes the entire form, it takes only the changes. And instead of looping over all five known keys, it loops over the keys that were actually given to it. So if a key isn't there, it stays not there. And if a key is `null`, it stays `null`. The two meanings don't get mixed anymore.

It also throws an error if it gets an unknown key, because that would be a programming mistake, and I'd rather fail loudly than silently send garbage to the server.

```js
if (
  key === 'priceMax' &&
  value !== null &&
  !(Number.isFinite(value) && value >= 0)
) {
  throw new Error('priceMax must be a finite number >= 0, or null');
}
```

And this guard is a bit of defense in depth, and the reason for it is a really sneaky JavaScript behaviour. If you call `JSON.stringify` on an object with `NaN` in it - JSON doesn't have a way to represent NaN, so it silently turns it into `null`. And `null`, as we know, means "delete". So a typo in the price field could turn into "delete the price cap", and the server would have no way to know, because what it receives is a perfectly valid `null`. That's why I block it on the client, in more than one place.

### The client: the editor

**[Open `src/client/SavedSearchEditor.jsx`, lines 46-49 and 82-88]**

The React component itself got much simpler. It now just calls the save module and shows a message based on the result.

I added two robustness fixes here as well. The first one is a `saving` flag. While a save is in progress, all the inputs and buttons are disabled. Why? Because otherwise, if the user double-clicks Save, we'd send two requests with the same version. The first one succeeds, the second one gets a 409, and the user sees a message saying "someone else changed this" - when actually it was themselves, a millisecond ago. That would be really confusing.

The second one is error handling when loading. In the original, if the first request failed, the page would just say "Loading…" forever. Now it shows a proper error message.

---

## Part 5: Proving it works (25-32 min)

**[Run `npm run verify`]**

Okay, so how do I know all this actually works? Let's start with the acceptance gate that came with the task. When I started, this was 0 out of 3. Every criterion failed. And at the same time, `npm test` was completely green. I think that's the best illustration of the whole problem - green tests, broken product.

Now it's 3 out of 3.

**[Run `npm test` and scroll through the output]**

And here's the full test suite. I built tests at every layer. At the bottom, there are fast unit tests for the pure functions - the serializer and the diff - with no network at all. Then there are API tests that go over real HTTP and check validation and concurrency. Then there's a flow test that drives the real client save logic against a real server. And at the top, the regression check. All together it's 44 tests in six files, plus the regression gate.

One more thing about the tests: they all use strict assertions, `node:assert/strict`. I'll explain later why that turned out to matter a lot.

**[Scroll to the regression section of the output]**

Now this is the part I'm proudest of. The task asked for a regression test that passes on my solution and fails on the original defective code. And the original code is frozen in a file called `reference_defect.js`. So my test runner runs the exact same scenarios twice - once against my code, and once against that frozen original.

Against my code, everything passes. Against the original, every scenario fails. But - and this is important - you can see why each one fails. "Query was not preserved, category was not preserved." "B's stale save was not rejected, status 200, expected 409." That matters, because a test could also fail on the original for a dumb reason, like crashing. That would technically give you "fails on the original", but it wouldn't prove anything. Here you can see that each scenario fails for exactly the right reason.

**[Open `test/regression.test.js`, line 79, then line 97]**

The test has three scenarios, and they mirror the incident. One: edit only the date, and check that the other four filters are still there with their original values. Two: clear only the price, and check that only the price disappeared. And three, the lost update. Both A and B read version 1. A saves a change, now it's version 2. Then B tries to save with the old version 1, and it must get a 409. And then I check that B's change didn't sneak in, and A's change is still there.

```js
if (b.status !== 409)
  problems.push(
    `B's stale save was not rejected (status ${b.status}, expected 409)`,
  );
```

I did this one sequentially, step by step, on purpose. The acceptance gate does it with two requests in parallel, which is good for testing real concurrency, but the order is up to the event loop. A sequential version is completely deterministic and describes the incident exactly.

And then I went one step further. I wanted to know whether this test would also catch a partial fix - because that's the kind of fix an AI tends to suggest. So I deliberately broke the code in different ways and checked whether the test noticed. If you fix the serializer but don't check versions, the test fails. If you check versions but keep the old serializer, it fails. If you make the store ignore nulls, it fails. And if you take the classic AI suggestion - "just filter out the nulls in the serializer" - it also fails, because then the user can't clear anything. So this test doesn't just catch the original bug, it catches the half-fixes too.

---

## Part 6: How I worked with AI (32-38 min)

**[Open `AI_WORKFLOW.md`, the "Tools used" section]**

So let me talk about how I used AI here, because I think that's what you're really interested in.

I split the work into roles. Claude Code worked in the repository - it read the code, made the changes, and ran the tests. And then I used a second, separate Claude session as a reviewer. Before any commit, I pasted the plan or the diff and the test output into that second session and had it reviewed. And I made the final decision on every step.

Why two AI sessions instead of one? Because the model that wrote the code tends to be optimistic about its own work. It's the same reason we do code review between people - the author is usually the worst person to spot their own mistakes. A fresh session, without the context of having written the code, looks at the result rather than the intention.

I also kept a strict rhythm: one step per prompt, one commit per step, and nothing gets committed before review. And I added one rule pretty early on: show me the artifact, not a summary of it. Because a few times Claude Code told me something like "here are the full file contents" or "confirmed, the test fails", and what was actually on the screen was just a collapsed tool call. An AI saying it checked something is not proof that it did.

> Optionally: I used Sonnet 5 in Claude Code as the implementer. The changes were small and well-scoped, so I wanted a model that's strong at code and fast to iterate with, since I was doing a lot of short prompt-review-commit loops. The deeper reasoning - reviewing plans and diffs - happened in a separate session on a stronger model. But honestly, I don't think the model choice was the main safeguard. Sonnet made mistakes, like the test that couldn't fail, and a bigger model can make the same kind of plausible-looking mistake. What caught them was the workflow: review before every commit, raw output instead of summaries, and mutation testing.

**[Open the "The moment the AI was wrong" section, then `test/client-flow.test.js` around line 64]**

Now, the most interesting mistake. Claude Code wrote a test with a really good name: "invalid price sends no request and leaves the server unchanged". It had assertions, it looked reasonable, and it passed. But when I read the body of the test, I noticed something. It called the function that computes the diff, it checked that an error was reported, and then it checked that the server hadn't changed. But it never called anything that could actually send a request to the server. So of course the server hadn't changed - nobody had touched it. That assertion was always true. You could have deleted the protection from the editor completely, and this test would still have been green.

And I think what makes this such a good example is that it's the same mechanism as the incident itself. The original test from the task was green because it sent the full form, so it could never reproduce the bug. And here the AI wrote another test that was green for the wrong reason.

The root cause was actually architectural. The decision "if there are errors, don't send" lived inside the React component, and you can't run that without a bundler. So there was simply no honest way to test it. That's why I moved the logic into `submitSavedSearchEdit`.

```js
const form = { ...original.filters, priceMax: 'abc', dateTo: '2026-06-20' };
```

And the new test sends an invalid price together with a valid date change. That's the trick. If the protection ever disappears, the valid date would actually be sent to the server, the version would go up, and the test would fail. And I didn't just trust that - I deleted the guard myself, ran the tests, watched this test fail, and put the guard back.

**[Open the "Where I intervened" section]**

There were a few other interventions I think are worth mentioning briefly.

The first plan from the AI didn't decide whether the version should be required. And as I said earlier, optional concurrency control is no concurrency control, so I made it required.

Then the assertions. Every test the AI wrote used the old-style `node:assert`, which compares values loosely, with double equals. And it turns out that in that mode, an object with `undefined` is considered equal to an object with `null`. In a task that is entirely about the difference between "missing" and `null`, the tests couldn't tell those two apart. The AI simply copied that pattern from the existing test file. So I switched everything to strict assertions in a separate commit.

Then the documentation. The AI wrote in the API contract that sending NaN for the price returns a 400. But that's impossible, because of the JSON behaviour I mentioned - NaN becomes `null` on the way, so the server actually returns 200 and deletes the price cap. That was the second time the same NaN-to-null bug showed up during this work - first in the code plan, then in the docs. So for me that's not a one-off, it's a systemic risk worth calling out.

And finally, the green-gate trap. After fixing only the serializer, the acceptance gate was already 3 out of 3. It would have been very easy to stop there. But the real editor was still sending the whole form. So I treated the gate as necessary, but not sufficient.

**[Optional: run `git log --oneline`]**

And you can see all of that in the history - fourteen commits, each one about one thing, and nothing squashed.

---

## Part 7: What's still left (38-40 min)

**[Open `AI_WORKFLOW.md`, the "Ownership note" section]**

Let me finish with the things I'd still want to do before this goes to production, because I think it's important to be honest about the limits.

First, the atomicity. Right now it relies on the data being in memory, in a single Node process. That's fine for this exercise, but in production, with a real database and probably several server instances, you'd do the version check inside the database itself - an `UPDATE` with `WHERE version = ?`, and then you check how many rows were affected. If it's zero, that's your 409.

Second, the React component itself isn't executed by any test. All the logic is extracted and tested, but the wiring - "when the result is a conflict, show this message" - isn't. Before production I'd add a component test with React Testing Library, and at least one end-to-end test in a real browser, maybe with Playwright - two tabs, two users, one conflict.

Third, the user experience after a conflict. Right now, when you click Reload, whatever you typed is gone. It would be much nicer to show your unsaved change next to the new version from the server, so you can decide what to keep. And the nice thing is, the server already sends the current state in the 409 response, so that's purely a front-end change.

Fourth, dates are only validated as text. There's no format check, and no check that the start date is before the end date. And there's a small trap there: because a patch can contain only one of the dates, that range check would have to run on the merged result, not just on the incoming request.

And if I could start over, the one thing I'd do differently is write the regression test first, against the frozen original, before writing any fix. Because if I had, I would have had an objective measure of progress from the very beginning, and that green-gate trap would never have been tempting.

That's everything from my side. I'm happy to go deeper into any of this, or to make a change live.

---

## If they ask for a live change

Before touching anything, say this out loud:

Okay, so before I ask the AI to do anything, let me first check which files this actually touches. Then I'll give the AI a narrow instruction - just this one change, don't commit, and show me the diff and the test output. I'll read the diff myself before I believe the summary. I'll add a test that fails before the change and passes after it. And then I'll run both `npm test` and `npm run verify`.

And a few things worth knowing in advance:

If they ask you to **add a new filter**, mention right away that the list of filter names lives in three places: `FILTER_KEYS` in `src/app.js`, `FILTER_KEYS` in `src/client/buildSavedSearchPatch.js`, and a hard-coded list inside `SavedSearchEditor.jsx`. You can say: "Before I start, I want to point out that this list is duplicated in three places, so I'll make sure the AI updates all of them - and I'd actually suggest having the component import the list instead of hard-coding it."

If they ask you to **show the other user's change on a conflict**, you can say: "The server already returns the current state in the 409 body, and `submitSavedSearchEdit` already passes it through as `result.search`. So this is only a UI change - I'd store it in the component's state and render it next to the form."

If they ask you to **validate dates**, say: "The format check goes into `validatePatchBody`. But the 'start before end' check has to happen on the merged result inside the store, because a single patch might only contain one of the two dates."

If they ask you **why you didn't just regenerate the types**, as `docs/ai-recommendation.md` suggests, say: "Because types check shape, not meaning. `priceMax: null` is a valid value for the type, so the broken request would pass type checking. The bug is about absent versus `null`, and both are legal according to the type. And types can't detect a concurrent edit at all - that needs a version check at runtime."

If they ask you to **use an `If-Match` header** instead of a version in the body, say: "That's the standard HTTP way, and I like it. But `verify.js`, which I'm not allowed to change, sends the version in the body, so I'd support both."
