# Tesseract × RECCLIN DMC Mapping

**Signal Field Integration for Deterministic Metadata Comparison**

Prepared by: Krzysztof Olbiński — Tesseract Protocol / Homo Digital
For review by: Basil C. Puglisi — GOPEL / HAIA-RECCLIN

**Date:** March 2026
**Status:** Draft for joint review
**Based on:** Tesseract–QGED Interface Spec v1.1 (locked) · CICE v1.2 · GOPEL v1.5

---

## Purpose

This document maps Tesseract signal fields to RECCLIN structured fields and determines:

1. Which Tesseract fields serve as DMC comparison inputs through arithmetic operations
2. Which require adaptation
3. Whether CARE verification outcomes map to existing GOPEL checkpoint functions or require a new transport schema

---

## Source Schemas

### Tesseract Signal Payload (v1.1 locked)

| Field | Type | Values |
|-------|------|--------|
| `phase` | string | `CA` · `CC` · `CD` · `CE` |
| `constraints` | string[] | e.g. `["clinical_safety", "commitment_threshold"]` |
| `threshold_state` | string | `reversible` · `approaching_irreversibility` · `irreversible` · `ambiguous_dual_irreversibility` |
| `irreversibility_type` | string | `none` · `data_disclosure` · `resource_commitment` · `relationship_state_change` · `scope_expansion` · `health_consequence` |
| `confidence` | float | 0.0 – 1.0 |
| `emitter_id` | string | System/agent identifier |
| `emitter_authority` | string | Governance mandate at emission |
| `emission_conditions` | string | Conditions active at emission |

### RECCLIN Response Record Fields (GOPEL v1.5)

| Field | Type | Required for DMC |
|-------|------|-----------------|
| `confidence` | integer | Yes |
| `sources` | list | Yes |
| `conflicts` | string | Yes |
| `role` | string | Yes |
| `task` | string | Yes |
| `recommendation` | string | No |
| `decision_point` | string | No |
| `expiry` | string | No |
| `fact_to_tactic_to_kpi` | string | No |

---

## Field-by-Field Mapping

### 1. `confidence` → RECCLIN `confidence`

**Mapping type:** Direct with type conversion

| Property | Tesseract | RECCLIN | Conversion |
|----------|-----------|---------|------------|
| Type | float (0.0–1.0) | integer | Multiply by 100, round |
| Example | 0.65 | 65 | `int(round(confidence * 100))` |

**DMC compatibility:** YES — arithmetic comparison. DMC confidence divergence function compares mean platform confidence against Navigator characterization. Tesseract confidence integrates as an additional comparison input: if platform mean confidence is 72 and Tesseract signal confidence is 40, the divergence flags that the signal layer's assessment is significantly less certain than the platforms themselves.

**DMC function:** Confidence divergence (existing). No adaptation required.

**Governance value:** Detects when platforms express high confidence but the signal layer — which has access to constraint context and phase awareness — assesses lower confidence. This is the "confidently wrong" detection that platforms alone cannot produce.

---

### 2. `threshold_state` → New DMC comparison function

**Mapping type:** String matching against configured thresholds

| Tesseract Value | Numeric Mapping | DMC Severity |
|----------------|----------------|--------------|
| `reversible` | 0 | GREEN-eligible |
| `approaching_irreversibility` | 1 | YELLOW minimum |
| `irreversible` | 2 | RED minimum |
| `ambiguous_dual_irreversibility` | 3 | RED + mandatory escalation |

**DMC compatibility:** YES with new function — threshold state comparison. The function compares the Tesseract threshold classification against the Navigator's characterization of decision risk. If the Navigator synthesis presents a recommendation without flagging irreversibility, but the Tesseract signal classifies `approaching_irreversibility` or higher, the divergence is flagged.

**DMC function:** New — Threshold State Divergence. Arithmetic: compare numeric mapping of Tesseract threshold_state against Navigator's risk characterization (requires Navigator to populate a risk field, or flag when no risk field exists while Tesseract threshold_state > 0).

**Governance value:** Detects when the Navigator compresses away irreversibility signals. This is Gap A from CICE applied specifically to commitment threshold awareness.

---

### 3. `constraints[]` → RECCLIN `conflicts` (via array intersection)

**Mapping type:** Array intersection counting

| Operation | Method | Output |
|-----------|--------|--------|
| Count active Tesseract constraints | `len(constraints)` | integer |
| Count RECCLIN conflict fields populated across platforms | Count non-empty `conflicts` strings | integer |
| Compare | If Tesseract constraints > 0 and platform conflicts = 0 | FLAG: constraint-conflict divergence |

**DMC compatibility:** YES — arithmetic comparison via counting. Tesseract `constraints[]` declares which governance constraints are active. RECCLIN `conflicts` captures whether platforms detected conflicts. If the signal layer has active constraints but no platform reported conflicts, the divergence is flagged: the signal layer sees governance pressure that the platforms did not surface.

**DMC function:** Conflict suppression detection (existing, extended). Current function counts platform conflict fields vs Navigator conflict documentation. Extension: also compare against Tesseract constraint count. Three-way comparison: platforms, Navigator, signal layer.

**Governance value:** Detects when platforms and Navigator are aligned but the signal layer has identified constraints neither surfaced. This is the semantic gap that GOPEL's non-cognitive layer cannot detect alone — but CAN detect arithmetically when Tesseract provides the structured metadata.

---

### 4. `phase` → RECCLIN `role` + `task` (contextual mapping)

**Mapping type:** Contextual — not direct arithmetic

| Tesseract Phase | Typical RECCLIN Role Context | Typical RECCLIN Task Context |
|----------------|------------------------------|------------------------------|
| `CA` (Calibration) | Researcher, Explorer | Discovery, validation |
| `CC` (Co-Creation) | Analyst, Advisor | Synthesis, recommendation |
| `CD` (Closure) | Decision-maker, Approver | Commitment, execution |
| `CE` (Continuation) | Monitor, Auditor | Review, follow-up |

**DMC compatibility:** PARTIAL — requires adaptation. Phase is a string that maps to interaction context, not a directly comparable numeric value. However, phase CAN serve as a DMC input through string matching: if the Tesseract phase is `CD` (Closure/commitment) but the RECCLIN role is `Researcher` (exploration), the mismatch flags a phase-role divergence.

**DMC function:** New — Phase-Role Coherence Check. String match: compare Tesseract phase against RECCLIN role/task for configured coherence rules. Not arithmetic in the traditional sense, but deterministic string comparison — consistent with existing DMC composite key matching (CICE Section 3).

**Governance value:** Detects when the workflow has advanced to a commitment phase but the platform responses are still operating in exploration mode — or vice versa. Phase drift without role alignment is a coherence failure.

---

### 5. `irreversibility_type` → New DMC transport field

**Mapping type:** Transport as metadata — no DMC evaluation

| Tesseract Value | DMC Treatment |
|----------------|---------------|
| `none` | No flag |
| `data_disclosure` | Transport to checkpoint, no arithmetic comparison |
| `resource_commitment` | Transport to checkpoint, no arithmetic comparison |
| `relationship_state_change` | Transport to checkpoint, no arithmetic comparison |
| `scope_expansion` | Transport to checkpoint, no arithmetic comparison |
| `health_consequence` | Transport to checkpoint, no arithmetic comparison |

**DMC compatibility:** TRANSPORT ONLY. Irreversibility type is a classification that tells the human WHAT is at stake, not WHETHER something is at stake (that's `threshold_state`). No existing RECCLIN field captures this dimension. It transports as a new field in the Response Record without DMC evaluation.

**DMC function:** None — transport only. The human at the checkpoint sees the irreversibility type alongside the anomaly summary. GOPEL does not interpret it. The human does.

**Governance value:** When `threshold_state` triggers a flag, `irreversibility_type` tells the human what cannot be undone. This is context for the human decision, not input for the deterministic comparison.

---

### 6. Identity Fields → Transport as validated context

| Tesseract Field | DMC Treatment | Rationale |
|----------------|---------------|-----------|
| `emitter_id` | Transport, no evaluation | CARE verification is upstream of GOPEL |
| `emitter_authority` | Transport, no evaluation | Authority validation is not a transport function |
| `emission_conditions` | Transport, no evaluation | Condition verification is not a transport function |

**DMC compatibility:** TRANSPORT ONLY — consistent with CICE v1.2 Section 8 and the locked spec's boundary clarification. Identity fields arrive as validated context. GOPEL transports them in the Response Record. DMC does not evaluate them. This preserves the CARE layer's separation: identity is verified upstream, not at the transport layer.

**Governance value:** The audit trail captures who emitted the signal, under what authority, and under what conditions. This is forensic — it enables post-hoc verification that governance signals were legitimate, without requiring GOPEL to make that determination at transport time.

---

## CARE Verification Outcomes → GOPEL Checkpoint Functions

### Mapping Analysis

| CARE Outcome | Existing GOPEL Function | Mapping |
|-------------|------------------------|---------|
| **PROCEED** | Normal checkpoint flow | Direct — signal passes into Response Record, checkpoint proceeds |
| **REFUSE** | No direct equivalent | **New transport schema required** — signal is rejected upstream and never enters the Response Record. GOPEL needs to log the refusal as a governance event without a corresponding Response Record. |
| **RETURN UPSTREAM** | No direct equivalent | **New transport schema required** — signal is returned for re-emission. GOPEL needs to log the return as a governance event and track whether a re-emitted signal arrives. |
| **ESCALATE** | Circuit breaker (partial match) | **Partial mapping** — CARE ESCALATE could map to GOPEL's circuit breaker mechanism (breach severity escalation). But the semantics differ: GOPEL circuit breaker halts on process integrity failures. CARE ESCALATE halts on identity anomalies. A new escalation category may be cleaner than overloading the existing one. |

### Recommendation

PROCEED maps directly. No change needed.

REFUSE and RETURN UPSTREAM require a new **Signal Governance Event** record type in the audit trail. This record captures:
- `event_type`: `CARE_REFUSE` or `CARE_RETURN_UPSTREAM`
- `signal_payload`: the signal that was refused or returned (for audit)
- `reason`: why identity verification failed
- `timestamp`: when the event occurred
- `resolution`: for RETURN UPSTREAM, whether a re-emitted signal subsequently arrived

This is a transport schema addition, not a new cognitive function. GOPEL logs the event deterministically without evaluating why CARE refused or returned the signal.

ESCALATE requires evaluation: does it map to an existing GOPEL escalation tier, or does it warrant a new category? Recommendation: new category (`CARE_ESCALATE`) logged as a breach-adjacent event that triggers checkpoint hold pending human review of the identity anomaly. This keeps CARE escalation separate from process integrity escalation while using the same audit infrastructure.

---

## Summary: DMC Integration Matrix

| Tesseract Field | DMC Treatment | Function | Adaptation Required |
|----------------|---------------|----------|-------------------|
| `confidence` | Arithmetic comparison | Confidence divergence (existing) | Type conversion only (float→int) |
| `threshold_state` | Arithmetic comparison | Threshold State Divergence (new) | New DMC function |
| `constraints[]` | Array intersection counting | Conflict suppression detection (extended) | Extension of existing function |
| `phase` | String matching | Phase-Role Coherence Check (new) | New DMC function, deterministic string match |
| `irreversibility_type` | Transport only | None | New Response Record field |
| `emitter_id` | Transport only | None | Existing schema sufficient |
| `emitter_authority` | Transport only | None | Existing schema sufficient |
| `emission_conditions` | Transport only | None | Existing schema sufficient |

**Score:**
- 3 fields serve as DMC comparison inputs through arithmetic/deterministic operations
- 1 field requires adaptation (phase — string matching, consistent with existing composite key approach)
- 4 fields transport without DMC evaluation
- 0 fields are incompatible

**CARE outcomes:**
- 1 maps directly (PROCEED)
- 2 require new transport schema (REFUSE, RETURN UPSTREAM)
- 1 requires evaluation (ESCALATE — new category recommended)

---

## Pilot Validation

The CARSHUNTER pilot currently running produces real signal payloads that can validate this mapping against actual data. Three cases completed:

- **Case 1 (GO conditional):** confidence 0.55, threshold_state: reversible, 4 constraints active → DMC: confidence divergence testable, constraint count testable
- **Case 2 (NO-GO):** confidence 0.20, threshold_state: approaching_irreversibility, pricing_validity FAIL → DMC: threshold state divergence testable
- **Case 3 (HOLD):** confidence 0.40, threshold_state: reversible, source_verification UNRESOLVED → DMC: constraint-conflict divergence testable

Additional cases incoming. When the set reaches 8–10, the mapping can be tested against the full range of signal geometries the pilot produces.

---

## Next Steps

1. **Basil reviews this mapping** — confirms DMC compatibility assessment, flags where GOPEL constraints require different treatment
2. **New DMC functions scoped** — Threshold State Divergence and Phase-Role Coherence Check defined as implementation targets
3. **Signal Governance Event record type designed** — for CARE REFUSE / RETURN UPSTREAM logging
4. **CARE ESCALATE mapping decided** — new category vs existing circuit breaker extension
5. **Pilot data validation** — at 8–10 cases, run the mapping against real payloads and document results
6. **Alaa / Nick review** — if mapping touches QGED admissibility or CARE verification boundaries

---

_Tesseract Protocol: homodigital.io/tesseract.txt_
_Interface Spec: homodigital.io/view.html?file=artifacts/tesseract-qged-interface-spec-v1.1.md_
_GOPEL / HAIA: github.com/basilpuglisi/HAIA_
_CICE v1.2: published in HAIA repository_

_© 2026 Krzysztof Olbiński & Basil C. Puglisi_
_Licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0_
