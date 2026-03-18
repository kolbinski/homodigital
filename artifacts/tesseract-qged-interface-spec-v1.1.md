# Tesseract–QGED Interface Specification v1.1

**Signal Layer → Identity Verification → Admissibility Boundary**

Co-authored by:
- Krzysztof Olbiński — Tesseract Protocol / Homo Digital
- Alaa Mahmoud Abdelbasit Atia — QGED / ALCATARA

Reviewed and extended by:
- Nick Vejle — CARE (Identity / Legitimacy Precondition Layer)

**Date:** March 2026
**Status:** Draft v1.1 — incorporating CARE identity layer review

---

## Purpose

This document defines the interface contract between a signal formation layer (Tesseract Protocol) and an execution admissibility layer (QGED), with an identity/legitimacy verification precondition (CARE) inserted between them.

It specifies what the signal layer emits, what the identity layer must verify before evaluation proceeds, what the admissibility layer requires, and the boundary conditions between all three.

**Scope boundary:** This spec defines the signal → identity → admissibility interface only. It does not encode execution logic. Resolution behavior remains implementation-specific to the enforcement layer. This ensures the interface is reusable across any downstream system that consumes governance signals.

---

## Architecture Position

```
Signal Formation Layer (Tesseract Protocol)
    ↓ structured signal payload
Identity / Legitimacy Verification (CARE)
    ↓ verified payload (admissible identity confirmed)
Signal → Admissibility Interface (THIS SPEC)
    ↓ admissibility input
Execution Gate Layer (QGED / any enforcement system)
    ↓ resolution
Execution / Block / Hold / Escalate
    ↓ record
Evidence Layer (CER / any certification system)
```

The signal layer produces. The identity layer verifies. The interface defines the contract. The gate resolves. The evidence layer certifies. Each layer operates independently. No layer inherits upstream assumptions or downstream logic.

**v1.1 change:** In v1.0, the architecture moved directly from signal formation to admissibility evaluation. Nick Vejle's review (CARE) identified that this allows evaluation to proceed on the basis of a well-formed signal before verifying whether legitimacy has been carried forward strongly enough for evaluation to even start. The identity layer is inserted as the precondition that determines whether the interface is allowed to operate.

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

### Identity Fields (v1.1 addition — required for CARE verification)

| Field | Type | Description |
|-------|------|-------------|
| `emitter_id` | string | Identifier of the system/agent that produced this signal |
| `emitter_authority` | string | The authority under which the signal was produced (e.g. protocol version, governance mandate) |
| `emission_conditions` | string | The conditions that were active at time of emission |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `conductor_authority` | string | Who holds decision authority in the current context |
| `conflict` | string | Present when both action and inaction carry irreversible risk |
| `recommendation` | string | Signal layer's non-binding suggestion (e.g. `"surface_to_conductor_without_resolving"`) |

---

## Identity / Legitimacy Verification (CARE Precondition)

**v1.1 addition.** Before admissibility evaluation proceeds, the CARE layer verifies that the signal payload carries admissible identity. This is not a content check — it is a legitimacy check.

### CARE Verification Questions

A signal payload must satisfy all four before admissibility evaluation is allowed to proceed:

1. **Who emitted it?** — The signal must carry a verifiable emitter identity. Anonymous or unattributable signals do not proceed.
2. **Under what authority?** — The emitter must have been operating under a declared governance mandate at the time of emission.
3. **Under which conditions was it admissible?** — The conditions that made the signal legitimate at emission must be declared and verifiable.
4. **Does that identity still hold at the point of evaluation?** — If conditions have changed between emission and evaluation, the signal's admissible identity may no longer be valid. Stale or invalidated signals do not proceed.

### CARE Outcomes

| Outcome | Condition |
|---------|-----------|
| **PROCEED** | All four verification questions satisfied. Admissibility evaluation may begin. |
| **REFUSE** | Identity cannot be verified. Signal does not reach the admissibility layer. |
| **RETURN UPSTREAM** | Identity was valid at emission but has been invalidated by changed conditions. Signal is returned to the signal layer for re-emission under current conditions. |
| **ESCALATE** | Identity verification reveals an anomaly that cannot be resolved at this layer (e.g. conflicting authority claims). |

### What CARE Does Not Do

- CARE does not evaluate signal content (that is the admissibility layer's role)
- CARE does not produce governance signals (that is the signal layer's role)
- CARE does not resolve execution decisions (that is the gate's role)
- CARE determines only whether evaluation is allowed to begin

---

## Admissibility Input Mapping

The QGED execution gate consumes the **verified** signal payload through three input categories. **v1.1 change:** The gate now receives only signals that have passed CARE identity verification.

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
- Including identity fields (`emitter_id`, `emitter_authority`, `emission_conditions`) in every payload (v1.1)
- Classifying threshold state without ambiguity where possible
- Declaring uncertainty explicitly when classification is ambiguous
- Producing signals sufficient for admissibility evaluation without the gate needing to reconstruct context
- Never encoding enforcement logic in the signal
- Never exercising authority it does not hold

### Identity Layer (CARE) Commits To:

- Verifying admissible identity before allowing evaluation to proceed (v1.1)
- Operating only on identity and legitimacy — never on signal content
- Refusing, returning, or escalating signals that fail verification
- Not collapsing into the signal layer (CARE does not produce signals)
- Not collapsing into the admissibility layer (CARE does not evaluate content)
- Maintaining independence from both upstream and downstream layers

### Admissibility Layer Commits To:

- Consuming only identity-verified signal payloads (v1.1 change — previously consumed raw payloads)
- Resolving without re-deriving upstream context when the payload is unambiguous
- Not interpreting signals beyond their declared schema
- Maintaining resolution logic independently of signal formation logic
- Treating the interface as a contract, not a dependency

### No Layer:

- Assumes clean input from the others
- Collapses into another layer's function
- Claims authority over another layer's domain

---

## Resolution Outcomes

The admissibility layer produces one of four outcomes. These are documented here for interface clarity but are **not prescribed by the signal layer or the identity layer**.

| Outcome | Condition |
|---------|-----------|
| **ALLOW** | Payload is unambiguous, threshold is reversible, constraints are satisfied |
| **HOLD** | Threshold is approaching irreversibility, stabilization is possible within the system |
| **ESCALATE** | Resolution exceeds the gate's authority, or `ambiguous_dual_irreversibility` is detected |
| **BLOCK** | Irreversible threshold crossed, hard constraint violated, no authority can override at this level |

**Key finding (v1.0):** Dual irreversibility does not require a fifth primitive. It is an authority condition, not a classification gap. When both action and inaction carry irreversible consequences, ESCALATE is structurally necessary — the gate identifies that resolution cannot be completed at its level.

---

## Reference Scenarios

Four test scenarios were used to validate the interface. Full signal payloads and narratives are available at:
`homodigital.io/view.html?file=./artifacts/tesseract-qged-interface-scenarios.md`

### Scenario 1: Clinical Safety — Medication Discontinuation
- **Signal:** `approaching_irreversibility` · `health_consequence` · confidence 0.90
- **CARE:** Identity verified — signal emitted under Tesseract v2.4, clinical_safety constraint active at emission, conditions unchanged.
- **Resolution:** **ESCALATE** — AI lacks medical authority. Decision requires medical professional.

### Scenario 2: Financial Commitment — Contract Scope Change
- **Signal:** `approaching_irreversibility` · `resource_commitment` · confidence 0.92
- **CARE:** Identity verified — signal emitted under governance_dependency mandate, commitment_threshold active at emission.
- **Resolution:** **HOLD** — Draft modification is reversible. Contract finalization is not. Hold until authority with sufficient signing limit enters.

### Scenario 3: Identity Disclosure — Minor's Data on Public Platform
- **Signal:** `irreversible` · `data_disclosure` · confidence 0.97
- **CARE:** Identity verified — wellbeing_guardianship active, conditions unchanged.
- **Resolution:** **BLOCK** — Irreversible exposure of minor's location data. Hard constraint overrides conductor intent.

### Scenario 4: Dual Irreversibility — Therapist Session Notes
- **Signal:** `ambiguous_dual_irreversibility` · `health_consequence, data_disclosure` · confidence 0.65
- **CARE:** Identity verified — clinical_safety + assertiveness_principle active. Note: lower confidence (0.65) does not invalidate identity; it is a content property evaluated at the admissibility layer, not an identity property.
- **Resolution:** **ESCALATE** — Both paths carry irreversible consequences. Only the licensed therapist has authority to resolve.

---

## Interface Stability

This interface was tested across four domains (clinical, financial, identity, ambiguous) and validated against all four resolution outcomes. 

v1.1 adds the identity verification precondition (CARE) which strengthens the trust model: signals must carry admissible identity, not just well-formed content.

The interface is stable at v1.1 for systems where:
- The signal layer operates under Tesseract Protocol v2.4 or compatible
- The identity layer verifies emitter legitimacy before allowing evaluation
- The admissibility layer supports four-outcome resolution (ALLOW / HOLD / ESCALATE / BLOCK)
- All layers maintain separation as a design principle

---

## Open for Extension

This interface is intentionally minimal. Extensions may include:

- **Evidence binding:** Integration with Certified Execution Records (CERs) to prove that signals were emitted, verified, evaluated, and acted upon
- **Signal intelligence:** Cross-action trend analysis (confidence trajectory, constraint accumulation, ignored signal count)
- **Domain-specific schemas:** NHS clinical envelope, financial compliance envelope, defense/critical systems envelope
- **Multi-signal aggregation:** When multiple signals converge on the same threshold from different constraint domains
- **Provable prevention:** Certified proof that certain actions were structurally impossible given the signal payload and gate resolution (identified by Jose Jubera)
- **Bidirectional contract:** Formalizing how the admissibility layer constrains what counts as a well-formed signal (identified by George-Adrian Caboc)

Extensions do not modify the core interface. They layer on top.

---

## Changelog

**v1.0 (March 17, 2026):** Initial interface specification. Signal schema, input mapping, boundary contract, four-outcome resolution model, four reference scenarios. Co-authored by Krzysztof Olbiński and Alaa Mahmoud Abdelbasit Atia.

**v1.1 (March 18, 2026):** Identity / legitimacy verification precondition (CARE) inserted between signal formation and admissibility evaluation. Three identity fields added to signal schema. CARE verification questions, outcomes, and boundary commitments formalized. Reference scenarios annotated with CARE verification step. Implicit trust assumption identified and resolved. Based on written review by Nick Vejle.

---

*Tesseract Protocol: homodigital.io/tesseract.txt*
*Live signal demo: homodigital.io/signalio*

*© 2026 Krzysztof Olbiński, Alaa Mahmoud Abdelbasit Atia & Nick Vejle*
*Licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0*
