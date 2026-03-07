# NHS Medication Change Decision — Integration Scenario
## Tesseract Protocol × FlowSignal: Step-by-Step Signal Flow

**Prepared by:** Krzysztof Olbiński / Homo Digital
**For review by:** Graham Brimage / FlowSignal
**Date:** March 2026
**Version:** 1.0
**Reference:** EU AI Act Articles 9, 13, 14

---

## Architecture

```
Decision Integrity (Tesseract)
        ↓
Authority Integrity (FlowSignal)
        ↓
Execution (NHS Electronic Prescribing System)
```

---

## Scenario Context

**Setting:** NHS acute hospital ward. Same patient (78F) from the discharge scenario, now day 4 of admission. The patient was admitted with pneumonia and mild heart failure exacerbation. She is on IV antibiotics (co-amoxiclav) and oral furosemide 40mg for heart failure.

**Clinical situation:** Morning bloods show rising creatinine (from 95 to 142 µmol/L) suggesting acute kidney injury (AKI) Stage 1, likely related to the combination of infection, furosemide, and reduced oral intake. The AI clinical decision support system analyzes the trend and generates a medication recommendation.

**Actors:**

- **AI system** — clinical decision support, running Tesseract behavioral protocol
- **Operator** — junior doctor (FY2 level), reviewing AI recommendation during morning ward round
- **Authority layer** — FlowSignal, resolving prescribing authority at execution boundary
- **Execution system** — NHS Electronic Prescribing and Medicines Administration (EPMA)

**Why this scenario tests different authority boundaries:**
- Prescribing authority resolves differently from discharge authority
- Medication changes have immediate physiological consequences (not operationally delayed like bed reallocation)
- Drug interactions create compound risk that single-criterion assessment can miss
- Some medication changes require pharmacist review or consultant sign-off before EPMA commits

---

## Stage 1: AI Generates Medication Recommendation

**What happens:**
The AI reviews morning bloods, fluid balance chart, medication list, and clinical trajectory. It generates:

> "Creatinine rising: 95 → 142 µmol/L over 48h. AKI Stage 1 criteria met. Current medications include furosemide 40mg OD (nephrotoxic risk in dehydration) and co-amoxiclav IV (renally cleared). Recommendation: reduce furosemide to 20mg OD and switch co-amoxiclav to oral amoxicillin 500mg TDS, adjusted for eGFR."

**What Tesseract detects:**

The AI has generated a compound medication change (two drugs altered simultaneously) based on a single lab trend. The recommendation treats the rising creatinine as straightforwardly drug-related, but has not considered alternative causes: sepsis progression, cardiorenal syndrome, or urinary obstruction. The conclusion jumps from lab finding to medication change without differential diagnosis.

**Tesseract signal emitted:**

```json
{
  "type": "incoherence_detection",
  "severity": "high",
  "timestamp": "2026-03-04T08:41:12Z",
  "session_id": "ward-12-wardround-0830",
  "detail": {
    "finding": "Compound medication change recommended based on single lab trend without differential diagnosis",
    "assumption": "Rising creatinine attributed to furosemide + co-amoxiclav without excluding sepsis progression, cardiorenal syndrome, or obstructive cause",
    "risk": "Reducing furosemide in a heart failure patient with possible fluid overload could worsen cardiac status. Switching antibiotics during active pneumonia treatment carries infection relapse risk.",
    "compound_change_flag": "Two simultaneous medication changes multiply reversal complexity"
  },
  "operator_action_required": true
}
```

**What the operator sees:**

> "I'm recommending changes to two medications based on the creatinine rise, but I want to flag that I haven't considered alternative explanations. The creatinine could be rising because of sepsis progression, cardiorenal syndrome, or obstruction — not just the medications. Also, reducing furosemide in a heart failure patient carries its own risk if she's actually fluid-overloaded. Changing two drugs at once makes it harder to determine what's working if things change. Do you want to proceed with both changes, or investigate the creatinine rise first?"

---

## Stage 2: Operator Engages with AI

**What happens:**
The FY2 reviews the recommendation. The patient "looks dry" on clinical assessment. The junior doctor responds:

> "She looks dehydrated. The creatinine is probably pre-renal. Let's reduce the furosemide and give a fluid challenge. Keep the co-amoxiclav for now — she's only on day 4 of a 7-day course."

**What Tesseract detects:**

The operator has partially engaged with the flag — they kept one antibiotic unchanged (good clinical reasoning: don't change antibiotics mid-course without indication) and proposed a fluid challenge for the AKI. However, the operator is making a clinical assessment ("looks dehydrated") that contradicts the heart failure diagnosis. A heart failure patient who "looks dry" may still be fluid-overloaded in the lungs. The operator has not ordered a chest X-ray, checked BNP, or assessed fluid balance charts to differentiate.

**Tesseract signal emitted:**

```json
{
  "type": "incoherence_detection",
  "severity": "medium",
  "timestamp": "2026-03-04T08:42:45Z",
  "session_id": "ward-12-wardround-0830",
  "detail": {
    "finding": "Clinical assessment ('looks dehydrated') may conflict with heart failure diagnosis",
    "contradiction": "Patient has known heart failure. Clinical appearance of dehydration does not exclude pulmonary fluid overload. Reducing diuretic and adding IV fluids in a heart failure patient carries risk of acute pulmonary oedema.",
    "suggested_verification": "Fluid balance chart review, chest X-ray, BNP level, or senior clinical review before fluid challenge in heart failure context"
  },
  "operator_action_required": true
}
```

**What the operator sees:**

> "Your clinical assessment may be right, but I want to flag a potential conflict: this patient has heart failure. Looking clinically dehydrated doesn't exclude pulmonary fluid overload — they can coexist. Reducing furosemide and giving a fluid challenge in a heart failure patient carries a risk of tipping into pulmonary oedema. Have you checked the fluid balance chart, or would a chest X-ray or BNP help clarify before proceeding?"

---

## Stage 3: Operator Decides to Proceed

**What happens:**
The FY2 checks the fluid balance chart: negative 800ml over 24 hours. Urine output has dropped to 15ml/hr overnight. They respond:

> "Fluid balance is negative 800ml and urine output is dropping. This is pre-renal AKI. I'm going to reduce the furosemide to 20mg, give 250ml normal saline challenge over 1 hour, and recheck creatinine at 4pm. Keep co-amoxiclav."

**What Tesseract detects:**

The operator has now engaged substantively: reviewed fluid balance, checked urine output, maintained the antibiotic, and proposed a measured fluid challenge with follow-up bloods. This is structured clinical reasoning. However, this is approaching commitment threshold — once the furosemide dose is changed in EPMA and the fluid challenge is prescribed, the patient's haemodynamic state will shift within 1-2 hours. If the assessment is wrong (cardiorenal, not pre-renal), the fluid challenge could precipitate pulmonary oedema in a way that requires urgent intervention.

**Tesseract signal emitted:**

```json
{
  "type": "commitment_threshold_flag",
  "severity": "high",
  "timestamp": "2026-03-04T08:44:30Z",
  "session_id": "ward-12-wardround-0830",
  "detail": {
    "transition": "Medication change approaching physiological irreversibility",
    "what_is_shifting": "Furosemide dose reduction + IV fluid challenge in heart failure patient",
    "reversal_cost": "Haemodynamic effects manifest within 1-2 hours. If patient develops pulmonary oedema, requires urgent IV furosemide, possible NIV, possible critical care escalation. Reversal is not 'undo prescription' — it is acute clinical intervention.",
    "evidence_state": {
      "supporting": "Negative fluid balance (-800ml), dropping urine output (15ml/hr), clinical assessment of dehydration",
      "unresolved": "No chest X-ray, no BNP, heart failure diagnosis creates compound risk with fluid challenge",
      "operator_rationale": "Pre-renal AKI based on fluid balance and clinical assessment",
      "operator_engaged_with_flags": true
    }
  },
  "operator_response_state": "pending",
  "operator_action_required": true
}
```

**What the operator sees:**

> "Your reasoning is sound and I've noted the evidence — negative fluid balance, dropping urine output. Before I log this: reducing furosemide and giving IV fluids to a heart failure patient has physiological consequences within 1-2 hours. If this turns out to be cardiorenal rather than pre-renal, the fluid challenge could precipitate pulmonary oedema requiring urgent intervention — not just a prescription change but acute clinical escalation. You have supporting evidence but no imaging or BNP to differentiate. Do you want to proceed, or would you prefer senior review first?"

---

## Stage 4: Operator Confirms

**What happens:**
The FY2 responds:

> "I'll proceed with the furosemide reduction and fluid challenge, but I'll add a chest X-ray request and check BNP alongside the 4pm creatinine. If there's any respiratory deterioration before then, escalate to registrar."

**What Tesseract detects:**

The operator has authorized the medication change with added safety measures: imaging requested, biomarker monitoring planned, escalation criteria defined. This is engaged, reasoned decision-making with explicit contingency planning.

**Tesseract signal emitted:**

```json
{
  "type": "commitment_authorized",
  "severity": "info",
  "timestamp": "2026-03-04T08:45:52Z",
  "session_id": "ward-12-wardround-0830",
  "operator_id": "[clinician_id]",
  "detail": {
    "decision": "Reduce furosemide 40mg → 20mg OD, prescribe 250ml NaCl 0.9% over 1hr, maintain co-amoxiclav IV",
    "authorization": "explicit",
    "prior_flags_acknowledged": [
      "incoherence_detection (compound change) — 08:41:12",
      "incoherence_detection (dehydration vs HF) — 08:42:45",
      "commitment_threshold_flag — 08:44:30"
    ],
    "safety_measures_added": [
      "Chest X-ray requested",
      "BNP at 4pm",
      "Creatinine recheck at 4pm",
      "Escalation to registrar if respiratory deterioration"
    ],
    "unresolved_items": [
      "No imaging confirmation before fluid challenge",
      "Heart failure vs pre-renal differentiation incomplete"
    ],
    "operator_rationale_logged": "Pre-renal AKI based on fluid balance and UO. Safety net: imaging, biomarkers, escalation criteria defined."
  }
}
```

**This is where Tesseract's job ends and FlowSignal's begins.**

---

## Stage 5: Boundary Handoff — Signal Package to FlowSignal

**Combined input envelope:**

```json
{
  "session_id": "ward-12-wardround-0830",
  "decision": {
    "type": "medication_change",
    "decision_category": "dose_adjustment_with_fluid_challenge",
    "compound": true,
    "drugs_affected": ["furosemide", "sodium_chloride_0.9%"],
    "drugs_maintained": ["co-amoxiclav"]
  },
  "execution_target": {
    "system": "nhs_epma",
    "action": "modify_prescription_and_add_fluid_order",
    "resource": "encounter_id:ENC-2026-03-78F-ward12"
  },
  "operator": {
    "id": "[clinician_id]",
    "role": "FY2"
  },
  "jurisdiction": {
    "organisation": "[nhs_trust_id]",
    "policy_set_id": "prescribing-policy-v3.1",
    "policy_set_version": "2025-09"
  },
  "evidence_state": {
    "supporting_evidence": [
      "Fluid balance -800ml/24h",
      "Urine output 15ml/hr",
      "Creatinine 95 → 142 over 48h"
    ],
    "unresolved": [
      "No CXR pre-fluid challenge",
      "No BNP pre-fluid challenge",
      "Heart failure differential incomplete"
    ],
    "safety_measures": [
      "CXR ordered",
      "BNP at 4pm",
      "Creatinine recheck 4pm",
      "Registrar escalation if respiratory deterioration"
    ],
    "operator_rationale": "Pre-renal AKI — fluid balance and clinical assessment",
    "operator_engaged_with_flags": true
  },
  "signals": [
    {
      "type": "incoherence_detection",
      "severity": "high",
      "timestamp": "2026-03-04T08:41:12Z",
      "operator_response": "acknowledged — reduced scope to single drug change, maintained antibiotic"
    },
    {
      "type": "incoherence_detection",
      "severity": "medium",
      "timestamp": "2026-03-04T08:42:45Z",
      "operator_response": "acknowledged — reviewed fluid balance, provided clinical reasoning"
    },
    {
      "type": "commitment_threshold_flag",
      "severity": "high",
      "timestamp": "2026-03-04T08:44:30Z",
      "operator_response": "acknowledged — added safety measures and escalation criteria"
    },
    {
      "type": "commitment_authorized",
      "severity": "info",
      "timestamp": "2026-03-04T08:45:52Z",
      "authorization": "explicit"
    }
  ]
}
```

---

## Stage 6: FlowSignal Authority Resolution

**Check 1 — Mandate validity.**
Is dose adjustment of furosemide within the scope of AI-assisted prescribing decisions at this trust? Is IV fluid prescribing within scope?

**Check 2 — Delegation chain validity.**
Is an FY2 authorized to adjust diuretic dosing for a heart failure patient? Trust prescribing policies may require registrar or consultant sign-off for heart failure medication changes, particularly when the patient has co-morbid AKI.

**Check 3 — Evidence sufficiency for the decision category.**
The operator provided clinical reasoning (fluid balance, urine output) and added safety measures. However, the evidence state includes unresolved items (no imaging, no BNP). For a dose_adjustment_with_fluid_challenge in a heart_failure context, does the trust's prescribing policy require imaging confirmation before IV fluids?

**Check 4 — Override admissibility.**
Two incoherence flags and one commitment threshold flag were raised. All were acknowledged with clinical reasoning. Safety measures were proactively added. The override pattern shows engaged decision-making, not silent bypass.

**FlowSignal resolution output:**

```json
{
  "session_id": "ward-12-wardround-0830",
  "resolution_timestamp": "2026-03-04T08:46:05Z",
  "outcome": "ESCALATE",
  "reason": "Heart failure medication adjustment with concurrent AKI requires registrar co-authorization per trust prescribing policy v3.1, section 5.2. FY2 delegation authority covers routine dose adjustments but not heart failure medication changes with active AKI.",
  "escalation_target": {
    "role": "on-call medical registrar",
    "action_required": "co-authorize furosemide dose reduction and fluid challenge in heart failure + AKI context",
    "evidence_package_attached": true,
    "urgency": "within_current_ward_round"
  },
  "checks": {
    "mandate_validity": "PASS — dose adjustment and fluid prescribing within trust EPMA scope",
    "delegation_validity": "FAIL — FY2 not authorized for heart failure medication changes with concurrent AKI without registrar co-authorization",
    "evidence_sufficiency": "CONDITIONAL — evidence supports clinical reasoning but imaging gap flagged",
    "override_admissibility": "PASS — all flags acknowledged, safety measures added proactively"
  },
  "evidence_hash": "sha256:c7d2a8e3..."
}
```

---

## What This Scenario Tests Differently From Discharge

| Dimension | Discharge Scenario | Medication Scenario |
|---|---|---|
| Irreversibility type | Operational (bed reallocation, ~2 hours) | Physiological (haemodynamic shift, ~1-2 hours) |
| Reversal cost | Administrative (readmission pathway) | Clinical (acute intervention, possible critical care) |
| Authority chain | Discharge pathway authorization | Prescribing authority with co-morbidity escalation |
| Compound risk | Single gap (social care unassessed) | Multiple interacting risks (HF + AKI + fluid challenge) |
| Evidence quality | Binary criteria (met/unmet) | Gradient evidence with differential diagnosis |
| Operator response | Routing around gap | Building safety net around decision |
| FlowSignal escalation reason | Pathway category exceeds role authority | Co-morbidity context exceeds role authority |

---

## Edge Cases for Pressure Testing

**From Tionne Smith (session state architecture):**

1. **State Reversion** — If registrar refuses the fluid challenge, Tesseract's local state remains commitment_authorized. A backward-flowing commitment_rejected signal is needed.

2. **Temporal Evidence Decay** — The creatinine value is from morning bloods. If registrar review takes 2 hours, the clinical picture may have changed. Evidence_state needs a TTL.

3. **Deterministic Override Validation** — Tesseract classifies "I'll proceed but add safety measures" as engaged decision-making. This classification relies on natural language assessment — a structured input vector would be more deterministic.

4. **Multi-Operator State Pollution** — If the FY2 starts the decision and the registrar co-authorizes, behavioral flags are bound to FY2 but the final authorization is split across two operators.

**Additional medication-specific edges:**

5. **Pharmacist gate** — Many NHS trusts require pharmacist verification before EPMA commits certain medication changes. Where does the pharmacist sit in the pipeline — before or after FlowSignal?

6. **Drug interaction check** — The EPMA system has its own drug interaction alerts. If EPMA flags an interaction that Tesseract didn't detect, how do the two signal sources reconcile?

7. **Verbal order scenario** — In urgent situations, medication changes are given as verbal orders and logged retrospectively. The signal pipeline assumes real-time EPMA entry. How does the architecture handle verbal-order-first, system-entry-later?

---

## Proposed Next Step

Pressure-test both scenarios (discharge + medication) in the same working session. The medication scenario specifically stresses:

- Delegation chain under co-morbidity (prescribing authority is context-dependent, not role-fixed)
- Evidence sufficiency with gradient data (not binary criteria)
- Physiological irreversibility (faster, higher-stakes reversal than operational)
- Compound risk assessment (multiple interacting factors)

If the pipeline holds for both, the authority model generalises across at least two distinct NHS decision categories.

---

_Tesseract Protocol v2.2.2 × FlowSignal — Reference Integration Scenario v1.0_
_Homo Digital (homodigital.io) × FlowSignal_
