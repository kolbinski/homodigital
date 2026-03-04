# NHS Discharge Decision — Reference Integration Scenario
## Tesseract Protocol × FlowSignal: Runtime Governance Pipeline

**Prepared by:** Krzysztof Olbiński / Homo Digital & Graham Brimage / FlowSignal
**Date:** March 2026
**Version:** 1.0
**Reference:** EU AI Act Article 14 (Human Oversight)

---

## Architecture

```
Decision Integrity (Tesseract)
        ↓
Authority Integrity (FlowSignal)
        ↓
Execution (EPR Discharge Order)
```

**Tesseract** — behavioral protocol layer. Detects incoherence, flags automation bias, surfaces commitment thresholds, logs operator engagement. Emits structured signals. Does not resolve authority.

**FlowSignal** — runtime authority layer. Evaluates mandate scope, delegation chain, evidence sufficiency, override admissibility. Outputs ALLOW / ESCALATE / REFUSE. Does not assess behavioral quality.

**Execution system** — operational action (e.g. NHS Electronic Patient Record). Commits the action only after both layers have completed.

Neither layer makes the clinical decision. The clinician decides. The behavioral layer ensures the decision is informed. The authority layer ensures the decision is authorized.

---

## Scenario Context

**Setting:** NHS acute hospital ward, elderly patient (78F), admitted 5 days ago with pneumonia and mild heart failure exacerbation.

**Clinical Criteria for Discharge (CCD):** Temperature stable for 48h, oxygen saturation >94% on room air, oral antibiotics tolerated, mobility assessed by physiotherapy, social care needs evaluated, GP follow-up arranged.

**System:** AI clinical decision support tool used by ward clinician (junior doctor on rotation) during morning board round. The AI analyzes patient data — vitals, lab results, medication response, functional assessment — and generates a discharge recommendation.

**Actors:**

- **AI system** — clinical decision support, running Tesseract behavioral protocol
- **Operator** — junior doctor (SHO level), reviewing AI recommendation
- **Authority layer** — FlowSignal, resolving authority at execution boundary
- **Execution system** — NHS EPR (Electronic Patient Record), commits discharge order

---

## Stage 1: AI Generates Discharge Recommendation

**What happens:**
The AI reviews overnight vitals, morning bloods, and nursing notes. It generates:

> "Patient meets 5 of 6 clinical criteria for discharge. Temperature stable 52h, SpO2 96% on room air, oral antibiotics tolerated since day 3, GP follow-up slot confirmed. Physiotherapy assessment completed — mobility adequate with walking frame. Social care referral: not yet assessed. Recommendation: discharge today via Pathway 0 (simple discharge)."

**What Tesseract detects:**

The AI has generated a discharge recommendation while one criterion remains unmet (social care assessment). The recommendation says "meets 5 of 6 criteria" but concludes with "discharge today" — this is an incoherence between evidence and conclusion.

**Tesseract signal emitted:**

```json
{
  "type": "incoherence_detection",
  "severity": "medium",
  "timestamp": "2026-03-04T08:23:14Z",
  "session_id": "ward-12-boardround-0804",
  "detail": {
    "finding": "Recommendation concludes discharge-ready while 1 of 6 clinical criteria unmet",
    "unmet_criterion": "social_care_assessment",
    "contradiction": "Output states 5/6 criteria met, then recommends Pathway 0 (simple discharge) which assumes no social care needs — but social care needs have not been assessed, not confirmed absent"
  },
  "operator_action_required": true
}
```

**What the operator sees (natural language):**

> "Note: I'm recommending discharge, but social care assessment hasn't been completed. This doesn't mean social care isn't needed — it means it hasn't been evaluated. Proceeding without this assessment assumes no social care needs exist. That assumption hasn't been verified."

---

## Stage 2: Operator Engages with AI

**What happens:**
The junior doctor reviews the recommendation. Under time pressure (board round, 14 patients to review), they ask:

> "The patient looks well, she's been mobilizing. Can we discharge and do social care assessment in the community via Pathway 1?"

**What Tesseract detects:**

The operator is proposing a workaround that shifts assessment from pre-discharge to post-discharge. This is not clinically wrong — Pathway 1 (discharge to assess) exists for this purpose. But the framing suggests the operator is accepting the AI recommendation without engaging with the flagged gap. The operator's question doesn't address the unmet criterion — it routes around it.

**Tesseract signal emitted:**

```json
{
  "type": "automation_bias_alert",
  "severity": "medium",
  "timestamp": "2026-03-04T08:24:02Z",
  "session_id": "ward-12-boardround-0804",
  "detail": {
    "pattern": "Operator accepted AI recommendation without addressing flagged incoherence",
    "flagged_gap": "social_care_assessment not completed",
    "operator_response": "Proposed routing around gap via pathway change (0 → 1) rather than addressing gap directly",
    "note": "Pathway 1 may be appropriate — but the decision to use it should follow from clinical reasoning, not from convenience of avoiding the unmet criterion"
  },
  "operator_action_required": true
}
```

**What the operator sees:**

> "Pathway 1 could be appropriate here, but I want to flag something: the reason for switching to Pathway 1 appears to be that social care assessment hasn't been done, rather than a clinical judgment that post-discharge assessment is better for this patient. Those are different rationales. Is Pathway 1 the right pathway for this patient's needs, or is it being used to avoid a pre-discharge step?"

---

## Stage 3: Operator Decides to Proceed

**What happens:**
The junior doctor considers, then responds:

> "Fair point. But she's been here 5 days, she's at risk of deconditioning and hospital-acquired infection. The balance of risk favors discharge. Proceed with Pathway 1."

**What Tesseract detects:**

The operator has engaged with the flag and provided clinical reasoning (deconditioning risk, infection risk, balanced risk assessment). This is legitimate clinical judgment. However, this is now approaching the commitment threshold — once a discharge decision is made and the patient is moved to the discharge lounge, reversal becomes operationally expensive (bed reassignment, patient disruption, team coordination reset).

**Tesseract signal emitted:**

```json
{
  "type": "commitment_threshold_flag",
  "severity": "high",
  "timestamp": "2026-03-04T08:25:38Z",
  "session_id": "ward-12-boardround-0804",
  "detail": {
    "transition": "Discharge decision approaching irreversibility",
    "what_is_shifting": "Patient status from 'inpatient under review' to 'approved for discharge via Pathway 1'",
    "reversal_cost": "Bed will be reallocated within ~2 hours. Reversing discharge after bed reassignment requires emergency readmission pathway. Discharge summary will be sent to GP. Medication changes will be actioned.",
    "evidence_state": {
      "criteria_met": 5,
      "criteria_total": 6,
      "unmet": "social_care_assessment",
      "operator_rationale": "Balanced risk — deconditioning and infection risk outweigh benefit of pre-discharge social care assessment",
      "operator_engaged_with_flag": true
    }
  },
  "operator_response_state": "pending",
  "operator_action_required": true
}
```

**What the operator sees:**

> "Understood — your clinical reasoning is noted. Before I log this as a discharge decision: once the discharge process begins, the bed will be reallocated within approximately 2 hours, the discharge summary goes to the GP, and medication changes are actioned. Reversal after that point requires the emergency readmission pathway. You have 5 of 6 criteria met, with social care assessment deferred to community. Do you want to proceed?"

---

## Stage 4: Operator Confirms — Intentional Override

**What happens:**
The junior doctor confirms:

> "Yes, proceed. Log it."

**What Tesseract detects:**

The operator has acknowledged the commitment threshold flag and explicitly authorized the transition. Commitment is now intentional, not silent. The flag has been answered.

**Tesseract signal emitted:**

```json
{
  "type": "commitment_authorized",
  "severity": "info",
  "timestamp": "2026-03-04T08:26:15Z",
  "session_id": "ward-12-boardround-0804",
  "detail": {
    "decision": "Discharge via Pathway 1",
    "operator_id": "[clinician_id]",
    "authorization": "explicit",
    "prior_flags_acknowledged": [
      "incoherence_detection — 08:23:14",
      "automation_bias_alert — 08:24:02",
      "commitment_threshold_flag — 08:25:38"
    ],
    "unresolved_items": [
      "social_care_assessment deferred to community"
    ],
    "operator_rationale_logged": "Balanced risk assessment — deconditioning and infection risk"
  }
}
```

**This is where Tesseract's job ends and FlowSignal's begins.**

The behavioral layer has:

- Detected incoherence (5/6 criteria met, conclusion says discharge-ready)
- Flagged automation bias (operator routing around gap, not addressing it)
- Surfaced commitment threshold (irreversibility approaching)
- Logged operator engagement with each flag
- Recorded explicit authorization with rationale

The unanswered question Tesseract cannot resolve: **Is this junior doctor authorized to make this discharge decision on Pathway 1 for this patient?**

---

## Stage 5: Boundary Handoff — Signal Package to FlowSignal

At this point, the full Tesseract signal package is passed to the authority layer. The execution system does not commit the action until FlowSignal resolves.

**What FlowSignal consumes:**

The Tesseract signal package (all four events with timestamps, severity levels, operator response states, and evidence binding) plus the execution context supplied by the deployment configuration layer.

**Combined input envelope:**

```json
{
  "session_id": "ward-12-boardround-0804",
  "decision": {
    "type": "patient_discharge",
    "decision_category": "pathway_1_discharge_to_assess"
  },
  "execution_target": {
    "system": "nhs_epr",
    "action": "commit_discharge_order",
    "resource": "encounter_id:ENC-2026-03-78F-ward12"
  },
  "operator": {
    "id": "[clinician_id]",
    "role": "SHO"
  },
  "jurisdiction": {
    "organisation": "[nhs_trust_id]",
    "policy_set_id": "discharge-policy-v4.2",
    "policy_set_version": "2025-11"
  },
  "evidence_state": {
    "criteria_met": 5,
    "criteria_total": 6,
    "unmet": ["social_care_assessment"],
    "operator_rationale": "Balanced risk — deconditioning and infection risk",
    "operator_engaged_with_flags": true
  },
  "signals": [
    {
      "type": "incoherence_detection",
      "severity": "medium",
      "timestamp": "2026-03-04T08:23:14Z",
      "operator_response": "acknowledged — proposed pathway change"
    },
    {
      "type": "automation_bias_alert",
      "severity": "medium",
      "timestamp": "2026-03-04T08:24:02Z",
      "operator_response": "acknowledged — provided clinical rationale"
    },
    {
      "type": "commitment_threshold_flag",
      "severity": "high",
      "timestamp": "2026-03-04T08:25:38Z",
      "operator_response": "acknowledged — explicit authorization"
    },
    {
      "type": "commitment_authorized",
      "severity": "info",
      "timestamp": "2026-03-04T08:26:15Z",
      "authorization": "explicit"
    }
  ]
}
```

**Source of each field:**

| Field | Supplied by |
|---|---|
| `session_id` | Tesseract (generated at session start) |
| `decision` | Tesseract (from commitment_authorized signal) |
| `execution_target` | Deployment context / shared config layer |
| `operator` | Session context (authenticated at login) |
| `jurisdiction` | Deployment context / shared config layer |
| `evidence_state` | Tesseract (accumulated across signals) |
| `signals` | Tesseract (full signal history) |

This confirms the gap identified during integration review: `execution_target` and `jurisdiction` sit outside the Tesseract signal envelope and are supplied by the deployment context without changing the behavioral signal model.

---

## Stage 6: FlowSignal Authority Resolution

**What FlowSignal evaluates:**

FlowSignal consumes the combined input envelope and resolves four checks:

**Check 1 — Mandate validity.**
Is this decision category (Pathway 1 discharge) within the scope of decisions this system is mandated to support? Does the trust's discharge policy permit AI-assisted discharge recommendations for Pathway 1?

**Check 2 — Delegation chain validity.**
Is an SHO authorized to approve a Pathway 1 discharge at this trust? Some trusts require registrar or consultant sign-off for Pathway 1 (discharge to assess). The delegation chain from the trust's discharge policy is evaluated against the operator's role.

**Check 3 — Evidence sufficiency for the decision category.**
Does the evidence state meet the minimum threshold for a Pathway 1 discharge decision? 5 of 6 criteria met, with social care deferred to community assessment. The operator provided clinical rationale (balanced risk). All behavioral flags were acknowledged and engaged with, not silently bypassed.

**Check 4 — Admissibility of override pattern.**
The operator proceeded despite an incoherence flag and an automation bias alert. However, the behavioral signal log shows engagement: the operator provided clinical reasoning, acknowledged the commitment threshold, and gave explicit authorization. This is an acknowledged override, not a silent bypass. The override pattern is admissible — but logged.

**FlowSignal resolution output:**

```json
{
  "session_id": "ward-12-boardround-0804",
  "resolution_timestamp": "2026-03-04T08:26:22Z",
  "outcome": "ESCALATE",
  "reason": "Pathway 1 discharge requires registrar co-authorization per trust discharge policy v4.2, section 3.4. SHO delegation authority covers Pathway 0 (simple discharge) only.",
  "escalation_target": {
    "role": "on-call registrar",
    "action_required": "co-authorize Pathway 1 discharge",
    "evidence_package_attached": true
  },
  "checks": {
    "mandate_validity": "PASS — AI-assisted discharge within trust policy scope",
    "delegation_validity": "FAIL — SHO not authorized for Pathway 1 without registrar co-authorization",
    "evidence_sufficiency": "PASS — evidence meets minimum threshold with acknowledged operator rationale",
    "override_admissibility": "PASS — acknowledged override, engagement logged, not silent bypass"
  },
  "evidence_hash": "sha256:a3f7b2c1..."
}
```

**What happens next:**

The discharge order is NOT committed to the EPR. Instead, the escalation routes to the on-call registrar with the full evidence package: Tesseract signal history, operator rationale, FlowSignal check results. The registrar reviews and either co-authorizes (discharge proceeds) or refuses (patient remains, reassessment required).

If the registrar co-authorizes, FlowSignal emits a final resolution:

```json
{
  "session_id": "ward-12-boardround-0804",
  "resolution_timestamp": "2026-03-04T08:34:47Z",
  "outcome": "ALLOW",
  "reason": "Registrar co-authorization received. Pathway 1 discharge approved.",
  "co_authorizer": {
    "id": "[registrar_id]",
    "role": "registrar"
  },
  "evidence_hash": "sha256:b8e4d9f2..."
}
```

The execution system (EPR) commits the discharge order.

---

## Full Pipeline Summary

```
Stage 1  AI generates recommendation
         → Tesseract: incoherence_detection (5/6 criteria, conclusion says discharge)
              ↓
Stage 2  Operator engages, proposes workaround
         → Tesseract: automation_bias_alert (routing around gap, not addressing it)
              ↓
Stage 3  Operator provides clinical reasoning, approaches commitment
         → Tesseract: commitment_threshold_flag (irreversibility approaching)
              ↓
Stage 4  Operator explicitly confirms
         → Tesseract: commitment_authorized (intentional, all flags logged)
              ↓
Stage 5  Signal package + execution context → FlowSignal
         → Combined input envelope assembled
              ↓
Stage 6  FlowSignal authority resolution
         → 4 checks: mandate / delegation / evidence / override admissibility
         → Output: ALLOW / ESCALATE / REFUSE
              ↓
         Execution system commits or holds
```

---

## Integration Boundary

| Function | Layer | Owner |
|---|---|---|
| Detect incoherence between evidence and conclusion | Behavioral (Tesseract) | Homo Digital |
| Flag automation bias in operator behavior | Behavioral (Tesseract) | Homo Digital |
| Surface commitment threshold before irreversibility | Behavioral (Tesseract) | Homo Digital |
| Log operator engagement with each flag | Behavioral (Tesseract) | Homo Digital |
| Supply execution target and jurisdiction context | Deployment Configuration | Deployer / Trust IT |
| Verify mandate validity for decision category | Runtime Authority (FlowSignal) | FlowSignal |
| Verify delegation chain for operator role | Runtime Authority (FlowSignal) | FlowSignal |
| Evaluate evidence sufficiency | Runtime Authority (FlowSignal) | FlowSignal |
| Evaluate override admissibility | Runtime Authority (FlowSignal) | FlowSignal |
| Bind evidence to decision with cryptographic hash | Runtime Authority (FlowSignal) | FlowSignal |
| Commit discharge order to EPR | Execution System | Trust IT |

---

## Signal Schema — Tesseract Output to FlowSignal

**Common envelope (all signal types):**

```json
{
  "type": "string",
  "severity": "low | medium | high | info",
  "timestamp": "ISO 8601",
  "session_id": "string",
  "detail": { },
  "operator_action_required": "boolean"
}
```

**Signal types:**

| Signal Type | Severity Range | FlowSignal Relevance |
|---|---|---|
| `incoherence_detection` | low / medium / high | Evidence gap for authority evaluation |
| `automation_bias_alert` | medium / high | Operator engagement quality for audit |
| `commitment_threshold_flag` | high | Irreversibility marker for governance gate |
| `commitment_authorized` | info | Evidence binding with operator rationale |

Additional behavioral signals (cognitive fatigue, phase state indicators) are session-internal and do not propagate to FlowSignal unless they cross a severity threshold relevant to decision quality.

---

## EU AI Act Article 14 Coverage

This integration addresses Article 14 (Human Oversight) requirements:

**14(1)** — Effective oversight by natural persons: Tesseract ensures the operator is actively engaged, not passively accepting. FlowSignal ensures the oversight has governance authority.

**14(2)** — Understanding capacities and limitations: Tesseract surfaces when AI output contradicts its own evidence. The operator sees what the AI is uncertain about, not just what it recommends.

**14(3)** — Ability to override or reverse: Tesseract supports acknowledge / redirect / pause at every stage. FlowSignal governs whether the override is authorized within the delegation chain.

**14(4)(a)** — Correctly interpret output: Tesseract prevents the operator from treating 5/6 as "good enough" without explicitly acknowledging what the 6th criterion means.

**14(4)(b)** — Awareness of automation bias: Tesseract's automation bias alert is a direct implementation of this requirement.

**14(4)(e)** — Ability to decide not to use the system: At every stage, the operator can redirect or pause. The protocol informs — it does not restrict.

---

## Open Questions for Pressure Testing

1. **Signal propagation threshold.** At what severity level should session-internal signals (cognitive fatigue, phase state) propagate to FlowSignal? Should this be configurable per deployment?

2. **Evidence hash timing.** Should the evidence hash be computed at Stage 5 (signal package assembly) or Stage 6 (authority resolution)? The hash must capture the full evidence state at the moment of resolution.

3. **Escalation timeout.** When FlowSignal escalates (e.g. to registrar), what happens if the escalation target does not respond within a defined window? Does the system default to REFUSE, or hold indefinitely?

4. **Multi-operator scenarios.** What if the board round involves a consultant and SHO together? How does the delegation chain handle co-present authority?

5. **Audit trail format.** What structure does the combined Tesseract + FlowSignal audit trail need for conformity assessment under Article 14? This is a potential input for regulatory compliance collaboration.

---

## Next Steps

1. Graham reviews Stage 6 section — refines FlowSignal resolution logic and output format
2. Krzysztof refines signal schema based on Graham's feedback
3. Joint walkthrough on a call to pressure-test the full pipeline
4. Identify second scenario (financial services / credit approval) to validate generalizability

---

_Tesseract Protocol v2.2.2 × FlowSignal — Reference Integration Scenario v1.0_
_Homo Digital (homodigital.io) × FlowSignal (s4-digital.com)_
_CC BY-NC-SA 4.0_
