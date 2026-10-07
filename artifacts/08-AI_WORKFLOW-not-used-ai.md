# 08. The "What I deliberately did NOT use AI for, and why" chapter

## What AI_WORKFLOW.md says

- **The decision to accept or reject each step.** Every commit was reviewed before it was made.
- **Reading the generated test files.** When Claude Code summarized a file instead of showing it, you opened it yourself.
- **Git:** pushing, keeping the history unsquashed, your own notes in `AI_WORKFLOW.md` in separate commits.
- **Scope decisions:** no bundler and no browser test runner, even though they would have allowed testing the JSX directly (the brief forbids a build tool).

## Plain explanation

This chapter answers the question: **where did you deliberately stop the AI and do something yourself?** Toptal wants to see that you understand where AI is risky. Each point has its reason:

### 1. Approval decisions
**Why not AI:** AI judges its own code optimistically. In this work it wrote "all green, ready to commit" many times, and review found a problem (the stale version 0, loose assertions, the tautological test). The final word has to belong to whoever is responsible for the result.

### 2. Reading the tests
**Why not AI:** a test is a **specification**. If the test is wrong, the whole validation is an illusion. And the AI summarized tests instead of showing them. The fact that tests pass says nothing about whether they check the right thing. The best example is the test that could not fail (file 06).

### 3. Git
**Why not AI:** the history is **graded** ("keep the Git history, do not squash"). One slip like `git push --force` or `git commit --amend` on a pushed commit is a history rewrite, i.e. breaking the requirement. Irreversible operations like these are worth doing consciously, by hand.

A side story to tell: GitLab showed "pipeline failed" (Auto DevOps with no CI configuration in the repo). You deliberately did **not** add `.gitlab-ci.yml`, because that is an unrelated change outside the task's scope.

### 4. Scope
**Why not AI:** AI likes to expand scope ("let's add a bundler, then we can test the JSX"). The brief clearly forbids a build tool. A scope decision is a business decision, not a technical one. Instead of breaking the scope, you chose a better design: logic in a pure module, JSX only displays.

## How to tell it in the interview

> "AI wrote the code. I kept for myself everything that is either irreversible or defines what correctness means: approving commits, reading tests, git history operations and scope decisions. A test is a specification. If I don't read it, I don't know what I actually proved."

## Questions you may be asked

**"Isn't that inefficient? You could have let the AI commit on its own."**
> "Claude Code did make the commits, but only after my approval. The cost of review is a few minutes per commit. The cost of a tautological test slipping through is a false sense of safety in production - that is exactly how this incident happened."

**"Where, in your view, is AI most dangerous?"**
> "In tests and in summaries. In production code a bug usually surfaces because something doesn't work. A bad test gives a green result and nobody looks further. And a summary saying 'confirmed, test fails' without output sounds like proof, but it isn't."

**"With more time, what else would you do without AI?"**
> "A manual pass through the UI in a browser: two tabs, two editors, a conflict. The tests go through the logic, but not through actual clicks."
