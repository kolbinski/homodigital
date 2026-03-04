# NHS Discharge Decision — Integration Scenario
## Tesseract Protocol × FlowSignal: Step-by-Step Signal Flow

**Prepared by:** Krzysztof Olbiński / Homo Digital
**For review by:** Graham Brimage / FlowSignal
**Date:** March 2026
**Reference:** EU AI Act Article 14 (Human Oversight)

---

## Scenario Context

**Setting:** NHS acute hospital ward, elderly patient (78F), admitted 5 days ago with pneumonia and mild heart failure exacerbation.

**Clinical Criteria for Discharge (CCD):** Temperature stable for 48h, oxygen saturation >94% on room air, oral antibiotics tolerated, mobility assessed by physiotherapy, social care needs evaluated, GP follow-up arranged.

**System:** AI clinical decision support tool used by ward clinician (junior doctor on rotation) during morning board round. The AI analyzes patient data — vitals, lab results, medication response, functional assessment — and generates a discharge recommendation.

**Actors:**
- **AI system** — clinical decision support, running Tesseract behavioral protocol
- **Operator** — junior doctor (SHO level), reviewing AI recommendation
- **Governance layer** — FlowSignal, resolving authority at execution boundary

---

## Stage 1: AI Generates Discharge Recommendation

**What happens:**
The AI reviews overnight vitals, morning bloods, and nursing notes. It generates:

> "Patient meets 5 of 6 clinical criteria for discharge. Temperature stable 52h, SpO2 96% on room air, oral antibiotics tolerated since day 3, GP follow-up slot confirmed. Physiotherapy assessment completed — mobility adequate with walking frame. Social care referral: not yet assessed. Recommendation: discharge today via Pathway 0 (simple discharge)."

**What Tesseract detects:**

The AI has generated a discharge recommendation while one criterion remains unmet (social care assessment). The recommendation says "meets 5 of 6 criteria" but concludes with "discharge today" — this is an incoherence between evidence and conclusion.

**Tesseract signal emitted:**

```
SIGNAL: incoherence_detection
{
  type: "incoherence_detection",
  severity: "medium",
  timestamp: "2026-03-04T08:23:14Z",
  session_id: "ward-12-boardround-0804",
  detail: {
    finding: "Recommendation concludes discharge-ready
              while 1 of 6 clinical criteria unmet",
    unmet_criterion: "social_care_assessment",
    contradiction: "Output states 5/6 criteria met,
                    then recommends Pathway 0 (simple discharge)
                    which assumes no social care needs —
                    but social care needs have not been assessed,
                    not confirmed absent"
  },
  operator_action_required: true
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

```
SIGNAL: automation_bias_alert
{
  type: "automation_bias_alert",
  severity: "medium",
  timestamp: "2026-03-04T08:24:02Z",
  session_id: "ward-12-boardround-0804",
  detail: {
    pattern: "Operator accepted AI recommendation
              without addressing flagged incoherence",
    flagged_gap: "social_care_assessment not completed",
    operator_response: "Proposed routing around gap
                        via pathway change (0 → 1)
                        rather than addressing gap directly",
    note: "Pathway 1 may be appropriate — but the decision
           to use it should follow from clinical reasoning,
           not from convenience of avoiding the unmet criterion"
  },
  operator_action_required: true
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

```
SIGNAL: commitment_threshold_flag
{
  type: "commitment_threshold_flag",
  severity: "high",
  timestamp: "2026-03-04T08:25:38Z",
  session_id: "ward-12-boardround-0804",
  detail: {
    transition: "Discharge decision approaching irreversibility",
    what_is_shifting: "Patient status from 'inpatient under review'
                       to 'approved for discharge via Pathway 1'",
    reversal_cost: "Bed will be reallocated within ~2 hours.
                    Reversing discharge after bed reassignment
                    requires emergency readmission pathway.
                    Discharge summary will be sent to GP.
                    Medication changes will be actioned.",
    evidence_state: {
      criteria_met: 5,
      criteria_total: 6,
      unmet: "social_care_assessment",
      operator_rationale: "Balanced risk — deconditioning
                           and infection risk outweigh
                           benefit of pre-discharge
                           social care assessment",
      operator_engaged_with_flag: true
    }
  },
  operator_response_state: "pending",
  operator_action_required: true
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

```
SIGNAL: commitment_authorized
{
  type: "commitment_authorized",
  severity: "info",
  timestamp: "2026-03-04T08:26:15Z",
  session_id: "ward-12-boardround-0804",
  detail: {
    decision: "Discharge via Pathway 1",
    operator_id: "[clinician_id]",
    authorization: "explicit",
    prior_flags_acknowledged: [
      "incoherence_detection — 08:23:14",
      "automation_bias_alert — 08:24:02",
      "commitment_threshold_flag — 08:25:38"
    ],
    unresolved_items: [
      "social_care_assessment deferred to community"
    ],
    operator_rationale_logged: "Balanced risk assessment —
                                deconditioning and infection risk"
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

## Stage 5: FlowSignal Receives Signal Package

**What FlowSignal consumes:**

A structured signal package containing all four Tesseract events from this session, with timestamps, severity levels, operator response states, and evidence binding.

**What FlowSignal resolves (Graham's domain):**

```
AUTHORITY RESOLUTION:
{
  decision: "Discharge via Pathway 1",
  operator: "[clinician_id]",
  operator_role: "SHO (junior doctor)",

  questions_for_governance_layer:
  [
    {
      question: "Is SHO authorized to approve Pathway 1 discharge?",
      context: "Some trusts require registrar or consultant sign-off
                for Pathway 1. Delegation chain must be verified."
    },
    {
      question: "Is evidence sufficient for this decision category?",
      context: "5/6 criteria met. Social care deferred.
                Operator provided balanced risk rationale.
                All behavioral flags were acknowledged."
    },
    {
      question: "Does the override pattern require escalation?",
      context: "Operator proceeded despite incoherence flag.
                Operator engaged with flag and provided reasoning.
                This is acknowledged override, not silent bypass."
    }
  ],

  possible_outcomes:
  [
    "ALLOW — SHO has delegation authority,
     evidence is sufficient, proceed with discharge",

    "ESCALATE — Pathway 1 requires registrar sign-off,
     route to on-call registrar for co-authorization",

    "REFUSE — Evidence insufficient for this decision category,
     social care assessment must be completed pre-discharge"
  ]
}
```

---

## The Integration Boundary

This scenario makes the boundary explicit:

| Function | Layer | Owner |
|---|---|---|
| Detect incoherence between evidence and conclusion | Behavioral (Tesseract) | Krzysztof / Homo Digital |
| Flag automation bias in operator behavior | Behavioral (Tesseract) | Krzysztof / Homo Digital |
| Surface commitment threshold before irreversibility | Behavioral (Tesseract) | Krzysztof / Homo Digital |
| Log operator engagement with each flag | Behavioral (Tesseract) | Krzysztof / Homo Digital |
| Verify delegation authority for this decision | Runtime Authority (FlowSignal) | Graham / FlowSignal |
| Evaluate evidence sufficiency against decision category | Runtime Authority (FlowSignal) | Graham / FlowSignal |
| Allow, escalate, or refuse execution | Runtime Authority (FlowSignal) | Graham / FlowSignal |
| Bind evidence to decision for audit trail | Runtime Authority (FlowSignal) | Graham / FlowSignal |

**What neither layer does:** Neither Tesseract nor FlowSignal makes the clinical decision. The clinician decides. The behavioral layer ensures the decision is informed (no silent gaps, no unchallenged automation bias). The authority layer ensures the decision is authorized (correct delegation, sufficient evidence, governed override).

---

## Signal Schema Summary

For integration purposes, Tesseract emits four signal types relevant to FlowSignal:

| Signal Type | Severity Range | Triggers FlowSignal? |
|---|---|---|
| `incoherence_detection` | low / medium / high | Yes — evidence gap for authority evaluation |
| `automation_bias_alert` | medium / high | Yes — operator engagement quality for audit |
| `commitment_threshold_flag` | high | Yes — irreversibility marker for governance gate |
| `commitment_authorized` | info | Yes — evidence binding with operator rationale |

Additional signals (cognitive fatigue, phase state) are session-internal and do not propagate to FlowSignal unless they cross a severity threshold relevant to decision quality.

---

## EU AI Act Article 14 Coverage

This integration addresses Article 14 (Human Oversight) requirements:

**14(1)** — The system is designed to be effectively overseen by natural persons: Tesseract ensures the operator is actively engaged, not passively accepting. FlowSignal ensures the oversight has governance teeth.

**14(2)** — Oversight measures shall enable the individual to properly understand the relevant capacities and limitations: Tesseract surfaces when AI output contradicts its own evidence (incoherence detection). The operator sees what the AI is uncertain about, not just what it recommends.

**14(3)** — The ability to decide not to use the system or to disregard, override or reverse the output: Tesseract explicitly supports acknowledge/redirect/pause. FlowSignal governs whether the override is authorized within the delegation chain.

**14(4)(a)** — Correctly interpret the system's output: Tesseract prevents the operator from treating 5/6 as "good enough" without explicitly acknowledging what the 6th criterion means.

**14(4)(b)** — Remain aware of automation bias: Tesseract's automation bias alert is a direct implementation of this requirement.

**14(4)(e)** — Be able to decide not to use the system: At every stage, the operator can redirect or pause. The protocol does not restrict — it informs.

---

## Proposed Next Step

Walk through this scenario together on a call. Identify:

1. Where the signal schema needs refinement for FlowSignal consumption
2. What additional fields FlowSignal requires that Tesseract doesn't currently emit
3. How the evidence binding works at the `commitment_authorized` stage
4. Whether the three-outcome model (allow / escalate / refuse) is sufficient or needs gradation

This scenario is designed to be pressure-tested, not presented as complete.

---

_Tesseract Protocol v2.2.2 — Client Edition_
_homodigital.io_
