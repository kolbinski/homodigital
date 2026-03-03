# Tesseract Protocol: A Runtime Governance Layer for Human Oversight Under EU AI Act Article 14

**Brief prepared by Krzysztof Olbiński | March 2026**

---

## The Problem

Article 14 of the EU AI Act requires that high-risk AI systems be designed for effective human oversight. In practice, most implementations reduce this to formal checkpoints — confirmation dialogs, approval workflows, audit logs. These satisfy the letter of the regulation but fail to address its intent.

The core issue: **humans over-rely on AI outputs by default.** Article 14(4)(b) explicitly names this as "automation bias" — the tendency to automatically rely on AI-generated results without critical evaluation. Current compliance measures (pop-ups, checkboxes, review steps) do not change the underlying interaction dynamic. They add friction, not oversight.

The missing layer is not another control **around** the AI system. It is a behavioral layer **within** the interaction itself — one that structurally changes how the AI engages with the human operator.

## The Proposal: Tesseract Protocol as a Runtime Governance Layer

The Tesseract Protocol is a configurable behavioral framework deployed as a system-level instruction layer on existing LLMs (Claude, GPT-4, Gemini). It does not require building custom models. It reconfigures how commercial AI systems interact with human operators by embedding governance principles directly into the interaction flow.

The protocol addresses four specific requirements of Article 14(4):

### 1. Assertiveness Principle → Art. 14(4)(b): Countering Automation Bias

**The requirement:** Humans must remain aware of the tendency to over-rely on AI output.

**The mechanism:** The protocol instructs the AI to actively challenge the user when it detects logical inconsistencies, unsupported assumptions, or confirmation-seeking behavior. Rather than defaulting to agreement (the standard LLM behavior optimized for user satisfaction), the system is configured to flag disagreement and surface tension points.

**Practical effect:** The AI becomes a structural counterweight to automation bias — not through a warning label, but through its actual behavior in the interaction.

### 2. Truth Maximization Hierarchy → Art. 14(4)(a): Understanding AI Capabilities and Limitations

**The requirement:** Humans must properly understand AI system capabilities and limitations, including detecting anomalies and unexpected performance.

**The mechanism:** The protocol enforces a strict priority hierarchy: safety > truth > interaction quality > protocol rules > default behavior. If producing a comfortable or satisfying response would require omitting or distorting information, the system selects truth. The AI explicitly states when it lacks sufficient information, when a question exceeds its competence, or when its output should not be treated as authoritative.

**Practical effect:** The system actively prevents the illusion of AI omniscience — one of the primary drivers of inappropriate over-reliance.

### 3. Commitment Threshold Detection → Art. 14(4)(d): Ability to Override or Reverse AI Output

**The requirement:** Humans must be able to disregard, override, or reverse AI system output in any particular situation.

**The mechanism:** The protocol monitors the trajectory of the interaction and flags moments when decisions approach irreversibility — when the cost of reversal increases significantly. The AI explicitly communicates: "This decision point has high downstream consequences. Proceeding will make reversal costly."

**Practical effect:** Human oversight shifts from a one-time gate at the end of a process to a continuous, context-aware function embedded throughout the interaction. The operator is prompted to exercise judgment precisely when it matters most.

### 4. Governance Dependency Principle → Art. 14(4)(e): Ability to Interrupt the System

**The requirement:** Humans must be able to intervene in or interrupt the AI system's operation.

**The mechanism:** The protocol explicitly defines itself as a guidance layer, not an enforcement layer. It includes a built-in acknowledgment that protocol-level instructions require external governance infrastructure for enforcement. The system can recommend stopping, flag risks, and refuse to proceed on specific paths — but the human operator retains full authority to override, pause, or terminate.

**Practical effect:** The interaction preserves genuine human agency rather than creating a new form of automated decision-making disguised as "AI-assisted oversight."

## What Exists Today

- A working protocol (v2.2.1) tested over 12 months of daily use across Claude, GPT-4, and Gemini
- Documented behavioral changes in AI output quality when operating under the protocol vs. default mode
- A concrete case study: a VR training persona design document produced in 5 minutes under the protocol, validated by a professional team (Immersion / metaCoach AI)
- Defined falsification criteria — 10 testable conditions under which the protocol would require revision

## What Does Not Exist Yet

- Formal academic validation or peer review
- Quantitative measurement framework for oversight quality improvement
- Integration with existing AI governance tooling or compliance platforms
- Deployment beyond single-operator use

## The Question

Does a runtime behavioral layer — one that changes how the AI interacts with its human operator rather than adding controls around the interaction — have a place in the practical implementation of Article 14?

If so, the logical next steps would be:

1. **Mapping exercise:** Detailed alignment of all protocol mechanisms against Article 14 sub-requirements
2. **Measurement framework:** Defining metrics for "oversight quality" that go beyond compliance checkboxes
3. **Pilot deployment:** Testing the protocol with a real team operating AI systems in a regulated context

---

_Contact: Krzysztof Olbiński — olbinski@gmail.com_
