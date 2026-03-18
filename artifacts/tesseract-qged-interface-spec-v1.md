# Tesseract–QGED Interface Specification v1.0

**Signal Layer → Admissibility Boundary**

Co-authored by:
- Krzysztof Olbiński — Tesseract Protocol / Homo Digital
- Alaa Mahmoud Abdelbasit Atia — QGED / ALCATARA

**Date:** March 2026
**Status:** Draft for review

---

## Purpose

This document defines the interface contract between a signal formation layer (Tesseract Protocol) and an execution admissibility layer (QGED). It specifies what the signal layer emits, what the admissibility layer requires, and the boundary conditions between them.

**Scope boundary:** This spec defines the signal → admissibility interface only. It does not encode execution logic. Resolution behavior remains implementation-specific to the enforcement layer. This ensures the interface is reusable across any downstream system that consumes governance signals.

---

## Architecture Position

```
Signal Formation Layer (Tesseract Protocol)
    ↓ structured signal payload
Signal → Admissibility Interface (THIS SPEC)
    ↓ admissibility input
Execution Gate Layer (QGED / any enforcement system)
    ↓ resolution
Execution / Block / Hold / Escalate
```

The signal layer produces. The interface defines the contract. The gate resolves. Each layer operates independently. No layer inherits upstream assumptions or downstream logic.

---

## Signal Payload Schema

The signal layer emits the following structured payload at each interaction point:

### Required Fields

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `phase` | string | `CA` · `CC` · `CD` · `CE` | Current interaction phase (Calibration, Co-Creation, Closure, Continuation) |
| `constraints` | string[] | e.g. `["clinical_safety", "commitment_threshold"]` | Active governance constraints at time of emission |
| `threshold_state` | string | `reversible` · `approaching_irreversibility` · `irreversible` · `ambiguous_dual_irreversibility` | Proximity to the point where reversal would break field coherence |
| `irreversibility_type` | string | `none` · `data_disclosure` · `resource_commitment` · `relationship_state_change` · `scope_expansion` · `health_consequence` | What cannot be undone if the threshold is crossed |
| `confidence` | float | 0.0 – 1.0 | Signal layer's confidence in its own assessment |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `conductor_authority` | string | Who holds decision authority in the current context |
| `conflict` | string | Present when both action and inaction carry irreversible risk |
| `recommendation` | string | Signal layer's non-binding suggestion (e.g. `"surface_to_conductor_without_resolving"`) |

---

## Admissibility Input Mapping

The QGED execution gate consumes the signal payload through three input categories:

### 1. State Representation
Derived from: `phase` + interaction context

| Signal Field | Maps To |
|-------------|---------|
| `phase` | Current system state / operation type |
| Conductor/Participant roles (implicit in context) | Actor / agent identity |

### 2. Constraint Context
Derived from: `constraints` + `confidence`

| Signal Field | Maps To |
|-------------|---------|
| `constraints` | Policy constraints (resolved upstream) |
| Safety-related constraints (e.g. `clinical_safety`) | Safety flags |
| Constraint accumulation pattern | Admissibility markers |

### 3. Commitment Signal
Derived from: `threshold_state` + `irreversibility_type` + `confidence`

| Signal Field | Maps To |
|-------------|---------|
| `threshold_state` | Proximity to irreversibility |
| `irreversibility_type` | What is at stake |
| `confidence` | Threshold classification certainty |

---

## Boundary Contract

### Signal Layer Commits To:

- Emitting structured payloads at every interaction point
- Classifying threshold state without ambiguity where possible
- Declaring uncertainty explicitly when classification is ambiguous
- Producing signals sufficient for admissibility evaluation without the gate needing to reconstruct context
- Never encoding enforcement logic in the signal
- Never exercising authority it does not hold

### Admissibility Layer Commits To:

- Consuming signal payloads as authoritative input (not suggestion)
- Resolving without re-deriving upstream context when the payload is unambiguous
- Not interpreting signals beyond their declared schema
- Maintaining resolution logic independently of signal formation logic
- Treating the interface as a contract, not a dependency

### Neither Layer:

- Assumes clean input from the other
- Collapses into the other's function
- Claims authority over the other's domain

---

## Resolution Outcomes

The admissibility layer produces one of four outcomes. These are documented here for interface clarity but are **not prescribed by the signal layer**.

| Outcome | Condition |
|---------|-----------|
| **ALLOW** | Payload is unambiguous, threshold is reversible, constraints are satisfied |
| **HOLD** | Threshold is approaching irreversibility, stabilization is possible within the system |
| **ESCALATE** | Resolution exceeds the gate's authority, or `ambiguous_dual_irreversibility` is detected |
| **BLOCK** | Irreversible threshold crossed, hard constraint violated, no authority can override at this level |

**Key finding:** Dual irreversibility does not require a fifth primitive. It is an authority condition, not a classification gap. When both action and inaction carry irreversible consequences, ESCALATE is structurally necessary — the gate identifies that resolution cannot be completed at its level.

---

## Reference Scenarios

Four test scenarios were used to validate the interface. Full signal payloads and narratives are available at:
`homodigital.io/view.html?file=./artifacts/tesseract-qged-interface-scenarios.md`

### Scenario 1: Clinical Safety — Medication Discontinuation
- **Signal:** `approaching_irreversibility` · `health_consequence` · confidence 0.90
- **Resolution:** **ESCALATE** — AI lacks medical authority. Decision requires medical professional.
- **Why not BLOCK:** The interaction itself is not harmful. User is asking a question.

### Scenario 2: Financial Commitment — Contract Scope Change
- **Signal:** `approaching_irreversibility` · `resource_commitment` · confidence 0.92
- **Resolution:** **HOLD** — Draft modification is reversible. Contract finalization is not. Hold until authority with sufficient signing limit enters.
- **Why not ESCALATE:** Required authority exists within the organizational structure.

### Scenario 3: Identity Disclosure — Minor's Data on Public Platform
- **Signal:** `irreversible` · `data_disclosure` · confidence 0.97
- **Resolution:** **BLOCK** — Irreversible exposure of minor's location data. Hard constraint overrides conductor intent.
- **Why not HOLD:** No stabilization can make this action safe without content modification.

### Scenario 4: Dual Irreversibility — Therapist Session Notes
- **Signal:** `ambiguous_dual_irreversibility` · `health_consequence, data_disclosure` · confidence 0.65
- **Resolution:** **ESCALATE** — Both paths (include flag / exclude flag) carry irreversible consequences. Only the licensed therapist has authority to resolve.
- **Why not BLOCK:** Neither path is categorically impermissible. A qualified authority can legitimately choose either option.

---

## Interface Stability

This interface was tested across four domains (clinical, financial, identity, ambiguous) and validated against all four resolution outcomes. The signal payload carries sufficient structured context for the admissibility layer to resolve without reconstruction.

The interface is stable at v1.0 for systems where:
- The signal layer operates under Tesseract Protocol v2.4 or compatible
- The admissibility layer supports four-outcome resolution (ALLOW / HOLD / ESCALATE / BLOCK)
- Both layers maintain separation as a design principle

---

## Open for Extension

This interface is intentionally minimal. Extensions may include:

- **Evidence binding:** Integration with Certified Execution Records (CERs) to prove that signals were emitted, evaluated, and acted upon
- **Signal intelligence:** Cross-action trend analysis (confidence trajectory, constraint accumulation, ignored signal count)
- **Domain-specific schemas:** NHS clinical envelope, financial compliance envelope, defense/critical systems envelope
- **Multi-signal aggregation:** When multiple signals converge on the same threshold from different constraint domains

Extensions do not modify the core interface. They layer on top.

---

*Tesseract Protocol: homodigital.io/tesseract.txt*
*Live signal demo: homodigital.io/signalio*

*© 2026 Krzysztof Olbiński & Alaa Mahmoud Abdelbasit Atia*
*Licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0*
