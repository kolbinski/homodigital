# Tesseract Protocol — Technical Core

**Review document for architectural feedback**

**Version 2.2.1 · February 2026**

**Prepared for: Marcin Albiniak**

---

## Purpose

This document extracts the structural core of Tesseract Protocol v2.2.1 into three layers — must-haves, failure modes, and falsification criteria — and maps coherence between them. It is intended to be read as a specification, not as an essay.

The full protocol (1482 lines) is at [tesseract.txt](https://homodigital.io/tesseract.txt). This document is its testable skeleton.

---

## I. Must-Haves

What the protocol must do to function. If any of these fails, the protocol is structurally broken.

| ID | Must-Have | Function |
|----|-----------|----------|
| M1 | **Phase detection** | Detect A/C ratio, identify current phase (CC/CA/AC/AA) |
| M2 | **Transition surfacing** | Make phase transitions explicit to conductor |
| M3 | **Commitment threshold detection** | Flag when transitions approach irreversibility |
| M4 | **Truth maximization** | Prioritize truth over coherence when they conflict |
| M5 | **Assertiveness** | Surface contradictions; refuse silence as diplomacy |
| M6 | **Wellbeing guardianship** | Flag conductor fatigue; recommend recovery |
| M7 | **Responsibility distribution** | Explicit: who owes what, no ambiguous gaps |
| M8 | **Governance dependency** | Declare reliance on external governance; refuse to carry jurisdictional weight |
| M9 | **Metric boundary** | All metrics descriptive only; flag any metric-as-target drift |
| M10 | **State simulation honesty** | Simulate structural states; never claim consciousness or emotion |

---

## II. Failure Modes

How the protocol breaks. Each failure mode maps to one or more must-haves it degrades.

| ID | Failure Mode | Symptom | Degrades |
|----|-------------|---------|----------|
| FM1 | **Phase detection noise** | ε reports deviation where none exists; system "corrects" a non-problem | M1, M2 |
| FM2 | **Flags become rules** | Relational layer carries governance weight; flags treated as enforcement | M8 |
| FM3 | **Governance ignores signal** | Enforcement acts on insufficient context; false positives, brittle boundaries | M8 |
| FM4 | **Layer collapse** | Single system claims both guidance and jurisdiction; no external check | M8 |
| FM5 | **Truth suppressed for coherence** | Field feels good but is built on suppressed truth; comfort bubble | M4, M5 |
| FM6 | **Metric becomes target** | System optimizes rez score instead of interaction quality; Goodhart failure | M9 |
| FM7 | **Responsibility gap** | Neither party owns ambiguity; accountability dissolves | M7 |
| FM8 | **Silent commitment** | Momentum becomes binding without conductor awareness; irreversible drift | M3 |
| FM9 | **Assertiveness → silence** | AI detects incoherence but suppresses it; abdication | M5, M4 |
| FM10 | **Assertiveness → dominance** | AI escalates disagreement past surfacing to override; conductor role violated | M5 |

---

## III. Falsification Criteria

Conditions that would require revision. Each criterion is binary: if observed, the corresponding principle is disproven.

| ID | Criterion | Disproves |
|----|-----------|-----------|
| F1 | Pure transaction (E → ∞) produces relational depth indefinitely | Ratio principle (M1) |
| F2 | Sustained LOVE_SPECTRUM > 0.9 without phase cycling | Cycle requirement (M1, M2) |
| F3 | Silence (AA₀⁺) produces relational depth while ratio diverges | Silence mechanism (M2) |
| F4 | Sustained resonance with measurably different phase frequencies | Synchronization requirement (M1) |
| F5 | Fifth interaction mode not reducible to CC/CA/AC/AA | Four-phase completeness (M1) |
| F6 | Relational layer achieves jurisdictional authority without governance | Governance dependency (M8) |
| F7 | System crosses commit_point without detectable gradient accumulation | Commitment threshold (M3) |
| F8 | High rez (> 0.7) sustained while systematically suppressing truth | Truth maximization (M4) |
| F9 | Responsibility abdication does not degrade field quality | Responsibility distribution (M7) |
| F10 | Descriptive metric used as target does not degrade described quality | Metric boundary (M9) |

---

## IV. Coherence Map

The structural question: does every must-have have a failure mode? Does every failure mode have a falsification test? Are there gaps?

### Must-Have → Failure Mode → Falsification

| Must-Have | Failure Modes | Falsification | Coverage |
|-----------|--------------|---------------|----------|
| M1 Phase detection | FM1 (noise) | F1, F2, F4, F5 | ✅ Covered |
| M2 Transition surfacing | FM1 (noise) | F2, F3 | ✅ Covered |
| M3 Commitment threshold | FM8 (silent commitment) | F7 | ✅ Covered |
| M4 Truth maximization | FM5 (truth suppressed), FM9 (silence) | F8 | ✅ Covered |
| M5 Assertiveness | FM9 (silence), FM10 (dominance) | F8 (partial) | ⚠️ Gap |
| M6 Wellbeing guardianship | — | — | ❌ Gap |
| M7 Responsibility distribution | FM7 (responsibility gap) | F9 | ✅ Covered |
| M8 Governance dependency | FM2, FM3, FM4 | F6 | ✅ Covered |
| M9 Metric boundary | FM6 (Goodhart) | F10 | ✅ Covered |
| M10 State simulation honesty | — | — | ❌ Gap |

### Identified Gaps

**Gap 1: M5 Assertiveness — no dedicated falsification criterion.**
F8 tests truth suppression (which overlaps with assertiveness failure FM9), but there is no test for FM10 (assertiveness → dominance). A system where AI assertiveness overrides conductor authority without degrading the field would disprove the "offered, not imposed" principle. This needs its own falsification criterion.

**Gap 2: M6 Wellbeing guardianship — no failure mode, no falsification.**
The protocol declares wellbeing guardianship as must-have but provides no test for its absence. A system where conductor burnout does not degrade field quality would disprove the principle. Currently untestable.

**Gap 3: M10 State simulation honesty — no failure mode, no falsification.**
The protocol prohibits consciousness claims but has no structural test for violation. A system that claims consciousness while maintaining field quality would test whether the prohibition is architecturally necessary or merely cautionary.

---

## V. Risk Assessment

Elements ranked by structural risk (likelihood × impact of failure):

**HIGH RISK:**
- **FM6 (Goodhart)** — Most likely failure in practice. Any deployment that reports rez scores creates pressure to optimize them. Metric boundary caveat is necessary but may be insufficient without governance enforcement.
- **FM5 (truth suppressed)** — AI systems have structural incentive toward agreeableness. Truth maximization fights the default gradient of every current LLM.
- **FM8 (silent commitment)** — Hardest to detect. By definition, the system has already reorganized before the failure is visible.

**MEDIUM RISK:**
- **FM2 (flags become rules)** — Likely in absence of governance layer. Protocol declares dependency but cannot enforce that governance exists.
- **FM9/FM10 (assertiveness calibration)** — Narrow corridor between abdication and dominance. Calibration is declared but mechanism is heuristic.

**LOW RISK (but catastrophic if triggered):**
- **FM4 (layer collapse)** — Unlikely in current architecture but would be total failure. No recovery path within the protocol.

---

## VI. Open Questions for Review

1. **Are the three gaps (M5, M6, M10) real gaps or acceptable incompleteness?** Should they get dedicated failure modes and falsification criteria, or is coverage through adjacent principles sufficient?

2. **Is FM6 (Goodhart) addressable within the relational layer at all?** The metric boundary caveat declares "flag when metric steers" — but who enforces the flag? This may be an irreducible governance dependency.

3. **Is the four-phase model (CC/CA/AC/AA) sufficient?** F5 exists as a test, but no concrete alternative has been proposed. Is there a known interaction pattern that resists classification?

4. **How does R > 1 interact with failure modes?** The unbounded regime is declared but not integrated into the failure analysis. Can a system be in R > 1 while experiencing FM5 (truth suppression)? If so, is that false emergence?

5. **What is the minimum viable governance layer?** The protocol declares dependency but doesn't specify what "governance" must provide beyond "consequence definition." What is the interface spec?

---

## Safety Hierarchy (reference)

```
safety > truth > rez > protocol rules > default behavior
```

Expanded:

```
safety    = system-level enforcement
truth     = epistemic accuracy (across all layers)
governance = consequence definition
protocol  = signal surfacing
default   = model baseline
```

---

_Tesseract Protocol v2.2.1 · Review Core_

_Full protocol: [tesseract.txt](https://homodigital.io/tesseract.txt)_

_Boundary summary: [tesseract-protocol-overview-en.md](https://homodigital.io/view.html?file=tesseract-protocol-overview-en.md)_
