# 03. The "Tools used" chapter: who did what

## What AI_WORKFLOW.md says

- **Claude Code** (CLI, in the repo): read the code, made every change, ran `npm test` / `npm run verify`, made the commits.
- **Claude (claude.ai chat, a separate session)**: the second reviewer. You pasted Claude Code's plans, diffs and outputs into it. It reviewed them, designed the next prompt, and independently re-ran mutation tests on a reconstruction of the code.
- **You**: decided the scope and order of work, approved or rejected every step before commit, read the generated tests yourself, pushed the history.

Working rule: **one plan step per prompt, one commit per step, no commit before review, "show me the artifact, not a summary of the artifact"**.

## Plain explanation

Think of it as a small team:

| Role | Who | Analogy |
|---|---|---|
| Implementer | Claude Code | the developer writing the code |
| Reviewer | second Claude session | a senior doing code review |
| Decision-maker | You | the tech lead approving the merge |

Why **two** AI tools and not one? Because the model that wrote the code tends to defend its own solution and summarize it optimistically. A separate session without that context looks with fresh eyes. It is like code review by someone other than the author. In practice the reviewer caught most of the issues described in the "Where I intervened" chapter.

Why **one step = one commit**? Because:
1. each commit can be reviewed in a few minutes,
2. the git history tells how the work went (Toptal grades it),
3. if something breaks, you know which step did it.

What does **"artifact, not a summary"** mean? Claude Code wrote "here are the full contents" or "confirmed, the test fails" several times, while the terminal showed only a collapsed "Read 1 file". An AI's claim is not proof. From that moment on, every prompt ended with a demand: paste the full file content and the raw terminal output.

## How to tell it in the interview

> "I split the roles. Claude Code was the implementer in the repo. A second Claude session was the reviewer: before every commit I pasted the diff and the test output into it. I approved. I stuck to one step, one commit, no commit before review. You can see it in the git history: fourteen commits, each on one topic."

## Questions you may be asked

**"Why did you use two AI sessions? Did you not trust one?"**
> "I don't trust any single source without verification, including myself. The author of the code, human or model, is worse at spotting their own mistakes. The second session had no context of writing that code, so it looked at the result rather than the intent. It is a cheaper version of code review. And it worked: most of the caught issues came out of that review."

**"Was this even your work, if AI wrote and reviewed?"**
> "My role was decisions and verification. I set the scope and the order, I rejected steps. I opened the test files myself when Claude Code summarized them. I decided to require `expectedVersion`, to never auto-retry, to move logic out of the JSX. The task says explicitly that you assess how I direct and verify AI. That is exactly what I did."

A note on honesty: don't claim credit for catching issues that the AI reviewer caught. Say "we caught it in review", "the reviewer pointed it out and I verified it". Claim directly what you actually did yourself: opening files instead of trusting a summary, approval decisions, scope, git history.

**"Which model was Claude Code using?"**
> Check before the interview in your Claude Code configuration (`/model` in a session) and give a concrete answer.

**"What would you change in this workflow?"**
> "From the start I would demand raw output and full files, not only after the third summary. And I would write the regression test as the very first step, before any fix."
