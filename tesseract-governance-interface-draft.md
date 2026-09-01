# Tesseract as a Governed Relational Capability — Interface Pattern (Draft v0.1)

## Purpose

This document describes, in generic terms, how a relational guidance layer such
as Tesseract can interface with an external governance or control plane. It
does not assume or require any specific governance architecture. It is written
so that any system implementing "admission," "authority," or "control plane"
concepts can plug Tesseract into its own model without adopting Tesseract's
internals as a governance framework.

This draft assumes the reader is already familiar with Tesseract's own
internal boundary between its relational (guidance) layer and governance
(jurisdiction), documented in the protocol's GOVERNANCE DEPENDENCY,
EVIDENCE NOT AUTHORITY, and CONDUCTOR AUTHORITY SCOPE sections (v2.6).
This document is the outward-facing counterpart: how that boundary meets
a system on the other side of it.

## The pattern

    External Authority
          |
          v
    Governance Admission  (a decision, made by the governance layer,
    |                       about what a session/actor is permitted to do)
    v
    Tesseract as governed relational capability
    (operates entirely within the admitted scope; produces no
     permissions of its own; see CONDUCTOR AUTHORITY SCOPE)
          |
          v
    Runtime evidence / material-change signal
    (a flag: phase transition, commit-point approach, coherence shift —
     descriptive, not directive; see EVIDENCE NOT AUTHORITY)
          |
          v
    Governance re-entry
    (the signal is evaluated by the governance layer, not acted on
     directly by Tesseract)
          |
          v
    Separate action admission
    (if the signal implies an action with effects outside the dialogue,
     that action requires its own, independent admission decision —
     it is never authorized by the relational signal itself)

## Roles in this pattern

**External Authority** — whatever legitimately grants permissions in the
deploying system: an organization, a legal framework, a platform's own
policy layer. Tesseract has no opinion on what this is and does not
attempt to be it.

**Governance Admission** — the decision, made entirely outside Tesseract,
about what scope of interaction is permitted before the relational layer
is ever invoked. Tesseract operates only within whatever scope has already
been admitted. This decision is not assumed to be binary — the governance
layer owns whatever state model it defines (allow, delay, block, unknown,
expired, or otherwise). Uncertainty or staleness in that decision must
never silently collapse into permission.

**Tesseract (relational capability)** — produces context-sensitive
interaction behavior, uncertainty handling, commitment-threshold detection,
and structured evidence about the state of a dialogue. It does not expand
its own scope, does not grant itself authority, and does not treat its own
output as self-authorizing (see EVIDENCE NOT AUTHORITY, v2.5).

**Runtime evidence** — the actual output of the relational layer: flags,
gradients, phase-transition signals. These describe what is happening.
They carry no enforcement weight on their own.

**Governance re-entry** — the point at which evidence flows back to
whatever system holds actual authority. Tesseract only ever emits a
re-entry CANDIDATE, tied to what changed and to the prior admission it
relates to — it does not itself decide that re-entry has occurred. That
determination, and any resulting state, belongs to governance. This is a
required step, not an optional one — a candidate that is never picked up
is evidence that accomplishes nothing.

**Separate action admission** — if a runtime signal implies that some
action with an external effect should occur, that action needs its own
admission decision from the governance layer, resolved to whatever state
that layer defines (allow, delay, block, unknown, expired, or otherwise).
The relational signal is input to that decision. It is never a substitute
for it, and an unresolved or uncertain decision must never default to
permission.

## What this pattern does not specify

This pattern deliberately does not define:
- how "External Authority" or "Governance Admission" are implemented
- what constitutes sufficient evidence for a governance layer to act
- enforcement mechanics, escalation policy, or audit requirements

Those are properties of whatever governance architecture is on the other
side of this interface. Tesseract's role is to be a well-behaved upstream
signal producer, not to prescribe how the downstream system should be built.

## Compatibility note

This pattern was developed in response to architectural review that
identified the need for a clean, non-collapsing relationship between a
relational capability and an external governance/control-plane
architecture. One such architecture (PIGA) informed the shape of this
pattern; PIGA itself is not referenced, used, or required by Tesseract,
and this document does not grant any rights to or claims about PIGA.

---
Draft v0.2 — accompanies Tesseract Protocol v2.6
Krzysztof Olbinski
