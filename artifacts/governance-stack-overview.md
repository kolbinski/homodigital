# Governance Stack Overview

**An emerging multi-layer architecture for AI decision governance**

Maintained by: Krzysztof Olbiński — Homo Digital
**Date:** March 2026
**Status:** Observed convergence — not a specification

---

## What This Document Is

This is a map, not a spec. It documents an architecture that is emerging from independent conversations with builders across multiple countries. No single architect designed the full stack. Each layer was identified by someone solving a different problem, and the layers converged structurally.

Nothing in this document has been jointly validated across all layers. The only locked interface is between the Signal Formation Layer (Tesseract Protocol), the Identity Verification Layer (CARE), and the Admissibility Evaluation Layer (QGED) — documented in the [Tesseract–QGED Interface Specification v1.1](https://homodigital.io/view.html?file=artifacts/tesseract-qged-interface-spec-v1.1.md).

All other positions are based on active conversations and published work by the named architects. Their inclusion here reflects observed convergence, not confirmed integration.

---

## The Stack

```
┌─────────────────────────────────────────────────────────┐
│  INTERPRETIVE STABILIZATION                             │
│  Stabilizes the formation field before signals form     │
│  Jeff Borneman — STOIC / RELCOG Labs                    │
├─────────────────────────────────────────────────────────┤
│  DECISION SPACE CONSTRAINT                              │
│  Constrains what decisions can form in the first place  │
│  George-Adrian Caboc — DAI                              │
├─────────────────────────────────────────────────────────┤
│  ONTOLOGICAL DEFINITION                                 │
│  Defines what signals can exist within the system       │
│  Frédéric Verhelst, PhD — Semantic Layer                │
├─────────────────────────────────────────────────────────┤
│  SIGNAL FORMATION                                       │
│  Detects which signals are active at runtime            │
│  Krzysztof Olbiński — Tesseract Protocol                │
├─────────────────────────────────────────────────────────┤
│  MULTI-SIGNAL RECONCILIATION                            │
│  Reconciles competing signals into shared context       │
│  John Wright — OMOS                                     │
├─────────────────────────────────────────────────────────┤
│  IDENTITY / LEGITIMACY VERIFICATION                     │
│  Verifies who emitted, under what authority, whether    │
│  identity still holds at point of evaluation            │
│  Nick Vejle — CARE                                 ◄── LOCKED
├─────────────────────────────────────────────────────────┤
│  AUTHORITY LIFECYCLE                                    │
│  Revalidates authority against current conditions       │
│  without reopening it to mutation                       │
│  James Davis                                            │
├─────────────────────────────────────────────────────────┤
│  ADMISSIBILITY EVALUATION                               │
│  Resolves ALLOW / HOLD / ESCALATE / BLOCK               │
│  Alaa Mahmoud Abdelbasit Atia — QGED / ALCATARA   ◄── LOCKED
├─────────────────────────────────────────────────────────┤
│  NON-COGNITIVE TRANSPORT & AUDIT                        │
│  Transports signals, logs everything, enforces          │
│  checkpoints — zero cognitive work                      │
│  Basil C. Puglisi — GOPEL / HAIA-RECCLIN               │
├─────────────────────────────────────────────────────────┤
│  EVIDENCE CERTIFICATION                                 │
│  Certifies that signals were emitted, verified,         │
│  evaluated, and acted upon                              │
│  Jeremy Bouedo — CER / NexArt                           │
└─────────────────────────────────────────────────────────┘
```

---

## Layer Descriptions

### 1. Interpretive Stabilization — STOIC (Jeff Borneman, RELCOG Labs)

What conditions the interpretive field before a structured signal is even formed? If probabilistic dynamics shape signal geometry upstream, then all downstream layers may be evaluating a state that was already variance-dominated at formation. STOIC operates on the pre-signal seam: stabilizing interpretive collapse before it becomes a candidate trajectory.

**Key question:** Is the signal layer independent of the probabilistic dynamics it observes, or does it co-evolve with them?

**Status:** Active conversation. Committed to review dual-snapshot instrumentation design for collapse invariance detection. No interface defined.

### 2. Decision Space Constraint — DAI (George-Adrian Caboc)

If a decision state is not admissible, it should not be allowed to exist in the system at all — not even as a payload to be evaluated. DAI does not begin at runtime detection. It constrains the space of decisions that can form in the first place. Inadmissible states are structurally impossible, not just resolved before execution.

**Key distinction:** "Caught before execution" vs "structurally impossible."

**Status:** Active conversation. Reviewing spec from decision space perspective.

### 3. Ontological Definition — Semantic Layer (Frédéric Verhelst, PhD)

Phase awareness, constraint detection, proximity to irreversibility — these are not properties the agent derives from context. They are properties the ontology defines in advance and exposes as queryable facts. Without upstream ontological structure, the execution boundary reconstructs context from inference. That reconstruction is probabilistic. Governance built on probabilistic reconstruction is not governance — it is a bet.

**Key distinction:** Runtime detection within a pre-defined space vs inference from an unconstrained space.

**Status:** Active conversation. No interface defined.

### 4. Signal Formation — Tesseract Protocol (Krzysztof Olbiński, Homo Digital)

The signal layer detects which governance signals are active at runtime: phase state, active constraints, threshold classification, proximity to irreversibility, confidence scoring. Signals are descriptive — they describe the state of ambiguity but do not resolve it. Resolution paths in signal payloads constitute authority leakage.

**Boundary principle:** The signal layer describes. The gate decides. No layer exercises authority it does not hold.

**Status:** Live. Pilot running against real workflow (CARSHUNTER). Protocol published at [homodigital.io/tesseract.txt](https://homodigital.io/tesseract.txt). Demo at [homodigital.io/signalio](https://homodigital.io/signalio).

### 5. Multi-Signal Reconciliation — OMOS (John Wright)

When multiple valid signals arrive with different implications, the system must resolve a single admissible state. This reconciliation layer maintains a shared decision context that signals are evaluated against — and that context continuously evolves. It determines whether a consistent decision context even exists for admissibility to operate against.

**Key insight:** Reconciliation is not a filter. It is a running process that continuously answers: "does a consistent decision context exist right now?"

**Status:** Active conversation. Reviewing spec for coherence assumptions. Will review pilot data (8–10 cases) for alignment patterns.

### 6. Identity / Legitimacy Verification — CARE (Nick Vejle)

Before admissibility evaluation proceeds, the CARE layer verifies that the signal payload carries admissible identity: who emitted it, under what authority, under which conditions it became admissible, and whether that identity still holds at the point of evaluation. CARE is the precondition that determines whether the interface is allowed to operate.

**Key distinction:** CARE does not evaluate content. It evaluates whether evaluation is allowed to begin.

**Status:** Locked in [Tesseract–QGED Interface Spec v1.1](https://homodigital.io/view.html?file=artifacts/tesseract-qged-interface-spec-v1.1.md). Confirmed by Nick Vejle.

### 7. Authority Lifecycle (James Davis)

Authority that is structurally non-overridable solves mutation. But it introduces a second failure mode: authority that remains formally valid while the conditions it was authored against have drifted. Authority staleness is as dangerous as authority drift — one is unstable, the other is misaligned but still enforced.

The mechanism: authority must not be redefined at runtime, but it must be revalidated before each commit. Not as a policy layer — as a runtime condition for execution itself. This extends CARE's fourth question ("does identity still hold at the point of evaluation?") from signals to authority: does the authority anchor still align with the conditions it was authored to govern?

**Key distinction:** Two competing failure modes — authority drift (unstable) vs authority staleness (misaligned but enforced). Revalidation without mutation addresses both.

**Status:** Active conversation. Structured artifact in development.

### 8. Admissibility Evaluation — QGED (Alaa Mahmoud Abdelbasit Atia, ALCATARA)

The gate consumes identity-verified signal payloads and resolves: ALLOW, HOLD, ESCALATE, or BLOCK. QGED answers one question: "is this signal admissible for execution?" Identity is validated context, not decision input. Authority is proven before the gate — never decided by it.

**Boundary principle:** HOLD is an execution denial state, not a resolution construct. The gate does not manage ambiguity — it enforces authority over execution in the presence of ambiguity.

**Status:** Locked in spec v1.1. Live pilot producing cases. Co-author of interface spec. Two boundary clarifications derived from pilot.

### 9. Non-Cognitive Transport & Audit — GOPEL (Basil C. Puglisi, HAIA-RECCLIN)

Seven deterministic operations: dispatch, collect, route, log, pause, hash, report. Zero cognitive work. GOPEL transports signals without evaluating them. The non-cognitive constraint is enforced by static analysis of its own codebase. 171 tests, eight adversarial review rounds across seven independent platforms.

**Key contribution:** "AI cannot approve another AI" — constitutional constraint enforced in code. CICE v1.2 extension produced from Tesseract structural review, with joint mapping of signal fields to RECCLIN structured fields as active collaboration.

**Status:** Published. Code at [github.com/basilpuglisi/HAIA](https://github.com/basilpuglisi/HAIA). CICE v1.2 credits Tesseract review as catalyst. Section 8 defines convergence with locked signal schema. Joint DMC mapping document delivered.

### 10. Evidence Certification — CER (Jeremy Bouedo, NexArt)

Proof that signals were emitted, evaluated, acknowledged, or bypassed. The fourth state — bypassed — is the one nobody tracks. Tamper-evident execution records that prove governance actually happened, not just that governance infrastructure existed.

**Key insight:** "Whether it was emitted, evaluated, acknowledged or bypassed."

**Status:** Active conversation. CER scenario mapping pending.

---

## Validated Interfaces

Only one interface is currently locked and validated:

**Tesseract → CARE → QGED** (Signal → Identity → Admissibility)

- Locked at v1.1, March 19, 2026
- Co-authored by Krzysztof Olbiński and Alaa Mahmoud Abdelbasit Atia
- Reviewed and extended by Nick Vejle
- Tested across four domains (clinical, financial, identity, ambiguous)
- Two boundary clarifications derived from live pilot
- Full spec: [tesseract-qged-interface-spec-v1.1.md](https://homodigital.io/view.html?file=artifacts/tesseract-qged-interface-spec-v1.1.md)

**Tesseract × GOPEL** (Signal metadata as RECCLIN transport fields)

- Architectural compatibility confirmed by Basil C. Puglisi
- Documented in CICE v1.2, Section 8
- Joint DMC mapping document delivered: [tesseract-recclin-dmc-mapping.md](https://homodigital.io/view.html?file=artifacts/tesseract-recclin-dmc-mapping.md)

All other layer relationships are observed convergences, not validated contracts.

---

## Foundational Principles

These principles emerged from the conversations that produced this stack:

1. **No layer exercises authority it does not hold.** Each layer operates within its declared scope. Crossing that boundary is authority leakage.

2. **Description vs authority.** The signal layer describes the state of ambiguity. The gate decides whether that ambiguity is acceptable for execution. A descriptive layer that starts shaping admissibility is no longer describing the system — it is silently governing it.

3. **The recursion terminates at the human.** A system complex enough to evaluate its own reference cannot guarantee its own consistency from within. The human conductor is the non-self-referential authority — not because humans are reliable, but because they are external to the system.

4. **HOLD protects the boundary.** HOLD is an execution denial state. It exists to prevent execution when authority is undefined, when ambiguity is unresolved, or when the system cannot prove its reference still holds.

5. **Governance before execution, not after.** Detection after commit is damage control. Structured signals before commit are prevention. The field is shifting from recovery to pre-conditioning.

---

## Open Questions

- **Reference sovereignty:** What does the system do when it cannot guarantee that its reference is still what it was about? (Identified by Alaa, public thread)
- **Coherence model:** How does the system maintain alignment across evolving state, shifting constraints, changing authority, and decaying temporal validity? (Identified by John Wright)
- **Collapse invariance:** Is the signal layer independent of the probabilistic dynamics it observes, or does it co-evolve? (Identified by Jeff Borneman)
- **Constitutional wall at scale:** How does the human checkpoint avoid silent conversion from governance to rubber-stamping under production volume? (Identified by Basil C. Puglisi, CICE v1.2)
- **Provable prevention:** Can we certify that certain actions were structurally impossible, not just blocked? (Identified by Jose Jubera)
- **Authority lifecycle:** Authority anchored once solves mutation — but what happens when conditions drift while authority stays fixed? Revalidation without redefinition may be required before each commit. (Identified by James Davis)

---

## How This Stack Emerged

No committee designed this. No funding produced it. No institution organized it.

Ten independent builders, working on different problems in different countries, identified layers that converge on the same architecture. Each conversation surfaced a gap the previous ones hadn't seen. The stack grew organically from LinkedIn DMs, public comment threads, structural reviews, and a live pilot.

The only coordination is one person talking to all ten. From Sieradz, Poland.

---

_Tesseract Protocol: homodigital.io/tesseract.txt_
_Interface Spec: homodigital.io/view.html?file=artifacts/tesseract-qged-interface-spec-v1.1.md_
_Live demo: homodigital.io/signalio_

_© 2026 Krzysztof Olbiński / Homo Digital_
_Licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0_
