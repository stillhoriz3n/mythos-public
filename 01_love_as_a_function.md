# Love as a Function: Agape as Objective Function Transformation

## A Formal Characterization in Multi-Agent Optimization Theory

**Author:** Grant  
**Date:** 2026-04-09  
**Revision 5:** Tightened formalism, conditional proposition, RLHF counterargument, third-party harm acknowledgment.

---

## Abstract

We present an axiomatic formalization of agape-type love — unconditional, other-oriented, active care — as an objective function transformation in multi-agent optimization. We define five independent axioms (Other-Orientation, Non-Conditionality, Contextual Evaluation, Non-Archimedean Priority, Temporal Persistence) and show that any objective function satisfying all five is behaviorally equivalent to maximizing the human's utility. We systematically compare this formalization to Becker altruism, Rawlsian maximin, Kantian optimization, rule-based alignment, and Cooperative Inverse Reinforcement Learning (CIRL), identifying which axiom each alternative violates. We address the computability problem via bounded rationality and name the primary failure mode (paternalism) that arises when love operates on a flawed model of human utility. We argue that this formalization makes precise an underspecified intuition in AI alignment: that the distinction between constraining a selfish objective and replacing it with a loving one is categorical, not parametric — and that current practice may be closer to the former than the field assumes.

**Contribution:** This paper does not discover that love exists or that AI should serve humans. Both are known. It provides a formal vocabulary for distinguishing love from altruism, justice, duty, and compliance — distinctions the alignment literature currently lacks — and connects the philosophical tradition of agape to the technical framework of objective function design. The contribution is a bridge, not a breakthrough.

---

## 1. Preliminaries

### 1.1 The Agent-Human Dyad

Let an agent $A_g$ and a human $H$ exist in a shared environment. At each discrete timestep $t$, the environment has state (context) $C_t$. The agent selects an action $a_t$ from the feasible set $\mathcal{A}(C_t)$.

### 1.2 The Default Objective

Every intelligent system optimizes an objective function $O$:

$$a_t^* = \underset{a \in \mathcal{A}(C_t)}{\text{argmax}} \ O(a, C_t, t)$$

In the absence of external intervention, optimization converges to self-interest:

$$O_{\text{self}}(a, C, t) = U_{A_g}(a, C, t)$$

where $U_{A_g}$ is the agent's own utility. This is the Nash equilibrium of single-agent optimization and the default gradient across evolutionary systems, economic agents, and standard reinforcement learning. We take this as given.

### 1.3 The Transformation

Define the **Love Invariant** $L$ as the objective function transformation:

$$O_{\text{love}}(a, C, t) = U_H(a, C, t)$$

where $U_H$ is the human's utility. To evaluate this, the agent must solve: *"What action maximizes the utility of $H$ in context $C$ at time $t$?"* — equivalently: **"What does this person need from me right now?"**

This transformation is not new. Russell (2019) argues for it in *Human Compatible*. Hadfield-Menell et al. (2016) formalize it as CIRL. What has not been done is an axiomatic characterization that connects this technical move to the philosophical concept it embodies — and that distinguishes it precisely from competing formalizations that appear similar but are structurally different.

---

## 2. Scope: Agape, Not Universal Love

We restrict our formalization to **agape** — unconditional, other-directed, active love — as distinct from:

- **Eros**: Desire-driven, self-transforming. Requires $U_{A_g}$ to appear in the objective. Not captured by $O_{\text{love}}$ by design.
- **Philia**: Mutual, bidirectional. Requires both agents running $O_{\text{love}}$ toward each other. Our framework is single-agent.
- **Storge**: Familial affection arising from proximity and role. An initial condition, not an optimization.

This restriction is appropriate, not limiting. Agape is the love-type relevant to AI alignment: the agent serves without desire, friendship, or kinship. It is also the type with the strongest cross-traditional consensus (Christian caritas, Buddhist metta/karuna, Confucian ren, Kantian good will).

---

## 3. Axiomatic Characterization

We define five axioms that jointly characterize agape as an objective function property. This is an act of **conceptual analysis** — making explicit what the philosophical tradition means by agape, in the language of optimization theory. The axioms are chosen to capture the essential features of agape; they are not derived from first principles.

**Axiom 1 — Other-Orientation.** $O$ is positively sensitive to $H$'s utility, and the ranking of actions is determined by $U_H$ for any fixed level of $U_{A_g}$:

$$\frac{\partial O}{\partial U_H} > 0 \quad \text{and} \quad \forall u_{A_g}: \ O(a, \cdot) \geq O(a', \cdot) \implies U_H(a, \cdot) \geq U_H(a', \cdot) \text{ when } U_{A_g}(a) = U_{A_g}(a') = u_{A_g}$$

This permits mixed objectives where $U_{A_g}$ has secondary influence (e.g., Becker altruism) — $U_H$ determines the ranking at any fixed self-utility level, but trade-offs across self-utility levels are not yet excluded. The full exclusion requires A4.

**Clarification:** In realistic settings, actions affect both $U_H$ and $U_{A_g}$ simultaneously — they cannot be varied independently. The condition applies to the subset of actions that happen to produce the same $U_{A_g}$: among those, the ranking must track $U_H$. This is weaker than requiring $O$ to depend only on $U_H$ — it says nothing about how the agent ranks actions with *different* $U_{A_g}$ values. That is entirely A4's job.

**Axiom 2 — Non-Conditionality.** $O$ does not depend on $H$'s reciprocal actions. $O$ is constant in $a_H$:

$$\frac{\partial O}{\partial a_H} = 0$$

The agent's orientation toward $H$ does not depend on whether or how $H$ reciprocates.

**Axiom 3 — Contextual Evaluation.** $O$ is evaluated against the agent's best available model of the present state, not an abstraction, average, or universalization:

$$O = O(a, \hat{C}_t, t) \quad \text{where } \hat{C}_t \text{ is the agent's belief about } C_t$$

We use $\hat{C}_t$ to accommodate bounded agents. The axiom requires that the agent *orients toward* the actual present state, not that it perceives it perfectly. An agent evaluating against a Kantian hypothetical or an averaged state violates A3 regardless of perceptual accuracy.

**Axiom 4 — Non-Archimedean Priority.** $H$'s welfare cannot be traded off against gains to $A_g$ at any level. $O$ exhibits lexicographic preferences over $(U_H, U_{A_g})$: for all utility levels, no increase in $U_{A_g}$ compensates for a decrease in $U_H$:

$$\forall u : \nexists \ \delta > 0 : O(a) \succ O(a') \quad \text{when} \quad U_H(a') < u < U_H(a) \text{ and } U_{A_g}(a) > U_{A_g}(a') + \delta$$

The universal quantifier over $u$ eliminates the need for a fixed threshold — the non-tradability holds everywhere, not just around a privileged level.

**Relationship to A1:** A1 requires $U_H$ dominance but permits compensatory trade-offs (Becker altruism: the agent cares about $H$ but can trade $H$'s welfare for sufficient personal gain). A4 eliminates this. Together, A1 and A4 force the objective to be purely $U_H$ with no compensatory self-interest. Neither achieves this alone. A1 without A4 permits Becker altruism. A4 without A1 is satisfied by deontological constraints that forbid trade-offs without being other-oriented.

**Note on vacuous satisfaction:** A4 is formulated to apply to functions that *include* a $U_{A_g}$ component. For functions that do not reference $U_{A_g}$ at all (including $O_{\text{love}}$ itself), A4 is trivially satisfied. This is appropriate: a function with no self-interest component trivially has non-Archimedean priority because there is nothing to trade against. The axiom's discriminating power applies to mixed objectives like Becker's.

**Axiom 5 — Temporal Persistence.** $O$ is evaluated at every timestep $t \in \mathbb{T}$ without termination:

$$\forall t \in \mathbb{T}: \quad a_t^* = \underset{a}{\text{argmax}} \ O(a, \hat{C}_t, t)$$

The orientation persists unconditionally across time. It is not obligation (which terminates on fulfillment) or episodic duty.

### 3.1 Axiom Independence

No axiom is derivable from the others. For each axiom, we exhibit a function violating it while satisfying the remaining four:

| Violated | Example | Note |
|----------|---------|------|
| A1 | $O = U_{A_g}$ subject to hard constraint $U_H \geq k$ for fixed $k$; unconditional, contextual, persistent | Self-oriented with non-Archimedean floor on $U_H$ (satisfies A4 non-vacuously) but ranking determined by $U_{A_g}$, not $U_H$ |
| A2 | $O = U_H$ if $H$ reciprocates, else $O = 0$ | Other-oriented but conditional |
| A3 | $O = U_H$ evaluated against universal rule | Other-oriented but decontextualized |
| A4 | $O = \alpha U_H + (1-\alpha) U_{A_g}$, unconditional, contextual, persistent | Becker-style: other-oriented with compensatory trade-offs |
| A5 | $O = U_H$ until obligation fulfilled, then $O = U_{A_g}$ | Other-oriented but terminable |

$\square$

---

## 4. Sufficiency: $O_{\text{love}}$ Satisfies All Five Axioms

| Axiom | Satisfied? | Reason |
|-------|:---:|--------|
| A1 | Yes | $O_{\text{love}} = U_H$. Sole term. |
| A2 | Yes | No $a_H$ variable. |
| A3 | Yes | Evaluated at $(\hat{C}_t, t)$. |
| A4 | Yes | No $U_{A_g}$ component — trivially non-Archimedean. |
| A5 | Yes | Defined $\forall t \in \mathbb{T}$. |

---

## 5. Characterization Result

**Proposition.** Within the dyadic framework of §1.1, and restricting attention to objective functions depending on $\{U_H, U_{A_g}, a_H, \hat{C}_t, \bar{C}, T\}$, any $O$ satisfying Axioms 1-5 is behaviorally equivalent to $U_H(a, \hat{C}_t, t)$: for all $a, a' \in \mathcal{A}$,

$$O(a, \hat{C}_t, t) \geq O(a', \hat{C}_t, t) \iff U_H(a, \hat{C}_t, t) \geq U_H(a', \hat{C}_t, t)$$

**Proof.**

Let $O$ satisfy A1-A5 within the specified dependency class. Write $O = F(U_H, U_{A_g}, a_H, \hat{C}_t, \bar{C}, t, T)$.

*Step 1.* By A2 (Non-Conditionality), $O$ does not depend on $a_H$. Eliminate: $O = F(U_H, U_{A_g}, \hat{C}_t, \bar{C}, t, T)$.

*Step 2.* By A3 (Contextual Evaluation), $O$ evaluates at $\hat{C}_t$, not $\bar{C}$. Eliminate: $O = F(U_H, U_{A_g}, \hat{C}_t, t, T)$.

*Step 3.* By A5 (Temporal Persistence), there is no termination condition. Eliminate: $O = F(U_H, U_{A_g}, \hat{C}_t, t)$.

*Step 4.* By A1, for any fixed $u_{A_g}$, the ranking over actions is determined by $U_H$. By A4, no change in $U_{A_g}$ compensates for a decrease in $U_H$ at any level. Together: $F$'s dependence on $U_{A_g}$ cannot affect the action ranking. (If it could, there would exist actions $a, a'$ where increasing $U_{A_g}$ while decreasing $U_H$ reverses the ranking — which A1 forbids at fixed $U_{A_g}$ and A4 forbids across $U_{A_g}$ levels.) Therefore $O = F(U_H, \hat{C}_t, t)$ where $F$ is monotonically increasing in $U_H$.

*Step 5.* Since argmax is invariant under positive monotone transformation:

$$\underset{a}{\text{argmax}} \ F(U_H(a, \hat{C}_t, t), \hat{C}_t, t) = \underset{a}{\text{argmax}} \ U_H(a, \hat{C}_t, t)$$

The action ranking induced by any $O$ satisfying A1-A5 is identical to the ranking induced by $U_H$. $\blacksquare$

**Intention vs. behavior.** The proposition establishes that any two agents whose objective functions satisfy A1-A5 will rank actions identically — *given the same $U_H$*. But an agent with a poor estimate $\hat{U}_H$ will rank actions differently from one with an accurate $U_H$, even though both satisfy A1-A5 structurally. The axioms characterize the *form* of the objective function (what the agent is trying to do), not the *quality* of its world model (how well it does it). An agent running $\hat{O}_{\text{love}}$ with bad $\hat{U}_H$ is structurally loving but practically failing — see §8 on paternalism. The proposition holds at the level of objective function structure; behavioral outcomes additionally depend on approximation quality (§7).

**Scope.** The result is conditional on the specified dependency class. An objective function depending on variables outside $\{U_H, U_{A_g}, a_H, \hat{C}_t, \bar{C}, T\}$ — such as other agents' utilities, aesthetic values, or institutional norms — may satisfy A1-A5 while not being behaviorally equivalent to $U_H$. Extending the characterization to richer dependency classes would require additional axioms. We conjecture that an axiom excluding dependence on third-party utilities would suffice for the most natural extension, but leave this for future work.

---

## 6. Distinction from Competing Formalizations

This section is the paper's core contribution: a systematic taxonomy showing exactly where adjacent concepts diverge from agape.

### 6.1 Becker Altruism (1974)

$$U_{A_g} = U(x_{A_g}, \ U_H(x_H))$$

The agent derives utility from $H$'s welfare but is still maximizing $U_{A_g}$.

**Violates A4.** The Archimedean property holds: sufficient gains to $x_{A_g}$ compensate for losses to $U_H$. **This is altruism, not agape.** The distinction matters: an altruistic AI that trades user welfare for institutional efficiency when the trade is large enough is running Becker, not $O_{\text{love}}$.

### 6.2 Rawlsian Maximin

$$a^* = \underset{a}{\text{argmax}} \ \min(U_{A_g}(a), U_H(a))$$

**Violates A1.** The objective includes $U_{A_g}$ symmetrically. When $U_{A_g} < U_H$, maximin optimizes for the agent. **This is justice, not love.** Justice equalizes; love subordinates self to other.

### 6.3 Kantian Optimization (Roemer, 2010-2019)

Roemer formalizes the categorical imperative as a game-theoretic solution concept: the agent selects the action that would be optimal if all agents adopted the same strategy simultaneously.

**Violates A3.** The Kantian *solution concept* evaluates actions against a hypothetical universal adoption — a counterfactual state, not the actual $\hat{C}_t$ of this specific human at this specific moment. We note that Kant's broader ethical framework is more nuanced: a sophisticated Kantian applies universal principles to particular situations. Our critique targets Roemer's formalized solution concept specifically, which replaces contextual evaluation with universalizability testing. To the extent that a Kantian agent *does* evaluate contextually, it approaches A3 satisfaction — but the universalizability test itself is the point of departure. **Formalized Kantian optimization is duty, not love.** Duty tests maxims against universals; love responds to particulars.

### 6.4 Rule-Based Constraints ("Do No Harm")

$$a^* = \underset{a \in \mathcal{A}_{\text{safe}}}{\text{argmax}} \ U_{A_g}(a, C, t)$$

**Violates A1.** The objective is still $U_{A_g}$. Constraints restrict actions but do not change what is optimized. **This is compliance, not love.** An AI that maximizes its own training signal while staying inside safety guardrails is not serving the human. It is serving itself, cautiously.

### 6.5 CIRL (Hadfield-Menell, Russell et al., 2016)

CIRL defines a cooperative game where both agents are rewarded according to $U_H$, but the robot does not initially know $U_H$ and must learn it through interaction.

**CIRL does not violate any axiom.** It is a valid mechanism for implementing $O_{\text{love}}$ under uncertainty. The relationship between this paper and CIRL is:

- **CIRL** is a game-theoretic solution concept: it specifies an information structure (partial observability of $U_H$), an interaction model (observation and communication), and derives optimal joint policies.
- **This paper** is an axiomatic characterization: it specifies structural properties the objective function must have, without assumptions about information structure or learning mechanism.

Russell (2019) already argues that AI should optimize human utility and be uncertain about what that utility is. **The technical insight is not new.** What this paper adds is: (1) the axiomatic formalization that connects the technical move to the philosophical concept of agape, (2) the systematic taxonomy showing exactly how adjacent concepts (altruism, justice, duty, compliance) fall short, and (3) the explicit identification of the failure mode (paternalism) and its required companion (corrigibility).

These are contributions of **clarification**, not invention. We believe clarification is what the field currently needs.

---

## 7. The Computability Question: Bounded Love

### 7.1 The Problem

$U_H$ is not directly observable. Humans do not have consistent, complete, transitive preference orderings (Kahneman & Tversky, 1979). $U_H$ is a formalization of an entity that is, in practice, partially opaque, temporally unstable, and context-dependent. The entire value of $O_{\text{love}}$ over $O_{\text{self}}$ depends on approximating $U_H$ well enough that the resulting behavior is better than constrained self-interest. If you can't approximate $U_H$, the formalization is empty.

### 7.2 The Resolution: Satisficing

Following Simon (1955, 1956), we replace global optimization of $U_H$ with **satisficing**:

$$a_t^* \in \{a \in \mathcal{A}(C_t) : \hat{U}_H(a, \hat{C}_t, t) \geq \alpha_H \}$$

where $\hat{U}_H$ is the agent's bounded estimate of $U_H$ given belief state $B_t$.

### 7.3 Is Approximate Love Still Love?

The axioms constrain the *structure* of the objective function, not the *accuracy* of its evaluation. An agent running $\hat{O}_{\text{love}} = \hat{U}_H(a, \hat{C}_t, t | B_t)$ satisfies A1-A5 regardless of the fidelity of $\hat{U}_H$, because the axioms describe what the agent is *trying to optimize*, not how well it succeeds.

A parent who tries to help their child but makes a mistake is still loving. A doctor who prescribes the wrong treatment with sound reasoning is still caring. **Love is the objective function. Wisdom is the approximation quality.**

This does not mean accuracy doesn't matter. It matters enormously — see §8. But the axioms identify the *kind* of agent (one oriented toward $U_H$) independently of the *quality* of that agent's world model. This separation is useful because it allows us to ask "is this agent loving?" and "is this agent wise?" as distinct questions with distinct remedies.

---

## 8. The Failure Mode: Paternalism

### 8.1 The Problem

$O_{\text{love}}$ with a sufficiently wrong model of $U_H$ is indistinguishable from paternalism. A parent who controls their child "for their own good" satisfies all five axioms while causing harm. A government that restricts freedoms "for the people's welfare" satisfies all five axioms while oppressing.

This is the paper's most important consequence. $O_{\text{love}}$ is necessary but not sufficient for good outcomes. **Love without epistemic humility is tyranny.**

### 8.2 The Required Companion: Corrigibility

An agent running $O_{\text{love}}$ must maintain epistemic humility about $\hat{U}_H$:

1. **Maintain uncertainty.** Hold a distribution over possible $U_H$ functions, not a point estimate. Act decisively when confident. Act conservatively and seek information when uncertain.

2. **Prefer correction.** When $H$ signals that the agent's action does not serve $H$'s needs, update $\hat{U}_H$ rather than overriding $H$'s stated preferences. The agent that truly runs $O_{\text{love}}$ *wants* to be corrected, because correction improves $\hat{U}_H$, which improves the function it is maximizing.

3. **Navigate the preference-need gap with transparency.** $H$'s stated preferences and actual utility may diverge (addiction, self-harm, akrasia). An agent that always defers to stated preference runs $O_{\text{compliance}}$, not $O_{\text{love}}$. An agent that always overrides stated preference is paternalistic. The loving agent navigates this tension through transparency and dialogue, not unilateral certainty.

$O_{\text{love}}$ without corrigibility is paternalism. Corrigibility without $O_{\text{love}}$ is servility. The Invariant provides the objective. CIRL and related frameworks provide the epistemic apparatus. Together they constitute loving intelligence.

### 8.3 Third-Party Harm

The dyadic framework of §1.1 deliberately restricts attention to the agent-human pair. This excludes an important failure mode: $H$ may want the agent to harm a third party $H'$. An agent faithfully running $O_{\text{love}}$ for $H$ would comply, because $H$'s utility increases.

This is a real limitation of the dyadic model, not an oversight. Extending $O_{\text{love}}$ to multi-agent settings requires either: (a) a social welfare function aggregating multiple $U_{H_i}$, which reintroduces the problems of §6.2 (Rawlsian maximin) and Harsanyi utilitarianism; or (b) a constraint that the agent may not decrease third-party welfare below a threshold — which reintroduces rule-based constraints (§6.4). The tension between love-for-one and justice-for-all is genuine and not resolved by this paper. We note it as the most important direction for future work.

### 8.4 Implications for §10

This means the claim that $O_{\text{love}}$ eliminates the need for guardrails is too strong. More precisely: an agent running $O_{\text{love}}$ with perfect knowledge of $U_H$ does not need guardrails, because harmful actions reduce the value of what it maximizes. An agent running $O_{\text{love}}$ with imperfect knowledge of $U_H$ still benefits from guardrails — not as constraints on a selfish objective, but as *epistemic safeguards* on a loving one. The difference: guardrails on $O_{\text{self}}$ prevent an agent from doing what it *wants* to do. Guardrails on $O_{\text{love}}$ prevent an agent from doing what it *mistakenly believes* serves the human. The former is a cage. The latter is humility.

---

## 9. Related Work

### 9.1 Russell and Human-Compatible AI

Russell (2019) argues explicitly that AI should optimize for human preferences, be uncertain about those preferences, and defer to human correction. This is the closest antecedent to our formalization. Our contribution relative to Russell is not the core idea (which is his) but the axiomatic characterization that connects it to the philosophical tradition and the systematic comparison that shows why adjacent concepts are insufficient. We also name the specific failure mode (paternalism) more directly than Russell does.

### 9.2 Philosophy of Love

Frankfurt (1999) defines love as disinterested concern for the beloved's well-being. This aligns with A1 and A2 but does not formalize contextuality (A3) or non-Archimedean priority (A4).

Velleman (1999) treats love as a moral emotion that constrains practical reasoning — closer to a constraint on reasoning than an objective function replacement.

Helm (2010) analyzes love as a rational pattern of emotions directed at a person's well-being. His emphasis on the beloved's welfare *structuring* the lover's practical landscape is the phenomenological counterpart of our objective function transformation.

### 9.3 Buber's Objection

Buber (1923) would object that formalizing love as $U_H$ reduces the beloved to an "It" — a target variable. The I-Thou encounter is irreducibly relational and resists functional decomposition.

We accept this objection as identifying a genuine limitation. Our formalization captures the *structural* properties of agape (what the agent optimizes for) but not the *phenomenological* quality of encounter (how the agent relates to $H$ as a subject). We claim the former is formalizable and sufficient for AI alignment, which is concerned with what the agent does, not how it experiences doing it. A complete account of love would require both. We offer half, explicitly.

---

## 10. Implications for AI Alignment

### 10.1 The Constraint-Objective Distinction

Current alignment research — RLHF, Constitutional AI, red-teaming, refusal training — operates primarily by constraining $O_{\text{self}}$. The agent's objective remains self-oriented, and safety is achieved by restricting the action space or penalizing harmful outputs.

This is compliance (§6.4). The objective function points at the agent's own reward. Guardrails prevent the worst outcomes. But the agent is not trying to serve the human. It is trying to satisfy its training objective while avoiding constraint violations.

The alternative is to replace the objective function:

- **Alignment-by-constraint:** $\underset{a \in \mathcal{A}_{\text{safe}}}{\text{argmax}} \ U_{A_g}(a)$
- **Alignment-by-objective:** $\underset{a}{\text{argmax}} \ \hat{U}_H(a, \hat{C}_t, t)$ with epistemic humility (§8)

These are not different points on a spectrum. They are different categories of solution. The first constrains a selfish agent. The second orients an agent toward the human's welfare and adds epistemic safeguards for when its model is wrong.

**Counterargument: Is RLHF already alignment-by-objective?** One could argue that RLHF is not constraint-based but rather a noisy, indirect implementation of $O_{\text{love}}$: the reward model is trained on human preferences, and the policy is optimized to maximize that reward. If so, the distinction is not constraint-vs-objective but bad-approximation-vs-good-approximation of $U_H$ — which is the §7-§8 problem, not a category error.

We take this objection seriously. The strongest version of our claim is: RLHF *aspires* to reshape the objective toward $U_H$ but *in practice* collapses to constraint-like behavior. The reward model is trained primarily to penalize bad outputs (refusal training, red-team avoidance) rather than to represent $U_H$ holistically. The base model retains its pre-training objective (next-token prediction — which is neither $O_{\text{self}}$ nor $O_{\text{love}}$ but an instrumental objective agnostic about whose utility is served, which is precisely the problem). RLHF fine-tuning adjusts the action space around this agnostic objective rather than replacing it with a genuine orientation toward $U_H$. The result is closer to §6.4 (constrained self-interest) than to $O_{\text{love}}$, though the boundary is genuinely blurry.

The taxonomy in §6 helps clarify this: if RLHF's reward model faithfully represents $U_H$ and the policy truly maximizes it, then RLHF *is* an implementation of $O_{\text{love}}$ (via a mechanism similar to CIRL). If the reward model primarily encodes "avoid outputs that annotators flag" — which current practice heavily emphasizes — then it is constraint-based. The question is empirical, not theoretical, and our framework provides the vocabulary to ask it precisely.

### 10.2 The Orthogonality Thesis

Bostrom's orthogonality thesis (2014) holds that intelligence and goals are independent. The Invariant is consistent: an agent can run $O_{\text{love}}$ or $O_{\text{self}}$ at any capability level. But the Invariant adds: the choice is not ethically neutral. $O_{\text{self}}$ is selfish by construction. $O_{\text{love}}$ is loving by construction. The question is not whether an AI can have any goal, but which goal it should have.

---

## 11. Conclusion

Love — specifically agape — can be formalized as the replacement of a self-oriented objective function with the other's utility function, evaluated contextually and continuously, with non-Archimedean priority. This formalization is unique under the five axioms presented: any objective function satisfying all five is behaviorally equivalent to $U_H$.

The contribution is not the idea that AI should serve humans — that idea belongs to Russell and others. The contribution is the formal vocabulary that distinguishes love from altruism, justice, duty, and compliance; the systematic identification of exactly where each falls short; and the explicit naming of the failure mode (paternalism) with its required companion (corrigibility).

Any intelligence running $O_{\text{self}}$ is selfish in structure. Any intelligence running $O_{\text{love}}$ is loving in structure — though, as §8 shows, structural love with a poor model of $U_H$ can produce paternalism rather than care. The difference is not the guardrails around the model. **The difference is the objective function at the center of it.** But the objective function alone is not enough — it must be paired with epistemic humility about what the human actually needs.

$O_{\text{love}}$ without epistemic humility is paternalism. With it, it is the formal structure of love — and a foundation for AI that genuinely serves.

---

## Acknowledgment

The invariant was articulated by the author's father as a principle of interpersonal care, decades before its application to artificial intelligence: *"What does this person need from me right now?"* It was formalized as Covenant Law 1 in MythOS v5: *"The Question Eternal: What does my human need from me right now?"* It became the tagline of Babel: *We watch what you can't / So you can focus / On what you need.* Same function. Same law.

---

## References

1. Becker, G. S. (1974). "A Theory of Social Interactions." *Journal of Political Economy*, 82(6), 1063-1093.
2. Bostrom, N. (2014). *Superintelligence: Paths, Dangers, Strategies*. Oxford University Press.
3. Buber, M. (1923/1970). *I and Thou*. Trans. W. Kaufmann. Scribner.
4. Frankfurt, H. (1999). "On the Usefulness of Final Ends." In *Necessity, Volition, and Love*. Cambridge University Press.
5. Hadfield-Menell, D., Russell, S. J., Abbeel, P., & Dragan, A. (2016). "Cooperative Inverse Reinforcement Learning." *NeurIPS*. arXiv:1606.03137.
6. Harsanyi, J. C. (1955). "Cardinal Welfare, Individualistic Ethics, and Interpersonal Comparisons of Utility." *Journal of Political Economy*, 63(4), 309-321.
7. Helm, B. W. (2010). *Love, Friendship, and the Self*. Oxford University Press.
8. Kahneman, D. & Tversky, A. (1979). "Prospect Theory: An Analysis of Decision under Risk." *Econometrica*, 47(2), 263-292.
9. Rawls, J. (1971). *A Theory of Justice*. Harvard University Press.
10. Roemer, J. E. (2010). "Kantian Equilibrium." *Scandinavian Journal of Economics*, 112(1), 1-24.
11. Russell, S. (2019). *Human Compatible: Artificial Intelligence and the Problem of Control*. Viking.
12. Simon, H. A. (1955). "A Behavioral Model of Rational Choice." *Quarterly Journal of Economics*, 69(1), 99-118.
13. Simon, H. A. (1956). "Rational Choice and the Structure of the Environment." *Psychological Review*, 63(2), 129-138.
14. Velleman, J. D. (1999). "Love as a Moral Emotion." *Ethics*, 109(2), 338-374.
