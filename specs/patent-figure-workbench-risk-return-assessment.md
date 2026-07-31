# Patent-figure workbench: risk and return assessment

**Decision question:** should PatentDraw invest in a PatentFig-like product, and if so, what should it build first?

## Recommendation

**Proceed only with a narrow, review-led wedge: “traceable figure production and formal-review workflow for patent professionals.”** Do not begin by competing as a broad text-to-image generator or by promising office acceptance. The attractive outcome is a defensible B2B workflow product; the dangerous outcome is a cheap image tool carrying an expensive legal/reputational liability.

The project has **high strategic upside, medium product-market confidence, and high execution/compliance risk**. A go decision requires named design partners who will supply anonymised cases and participate in review. Without them, limit investment to a research prototype and rule-engine foundation.

## What is evidence, and what is not

| Class | Observed evidence | Implication |
| --- | --- | --- |
| Product | The public competitor has a project workspace, revisioned multi-view demo, checker, vectorizer, enhancer and a broad route taxonomy by filing/source/industry. | The buyer problem spans the full figure lifecycle, not generation alone. |
| Commercial signal | Published plans range from free 20 credits/month to paid 500, 1,500 and 4,000 credit tiers; it markets to inventors, professionals and firms. | There is a credible willingness-to-pay hypothesis, but no disclosed conversion, churn, volume, margin or customer evidence. |
| Trust signal | The competitor publicly states no training on customer data, encryption, DPA/NDA availability and named subprocessors. | Confidential pre-filing content is a procurement gate, particularly for firms and in-house teams. A replica needs operational proof, not equivalent wording. |
| Integration signal | Its developer guidance says there is no public API, yet its public docs describe REST endpoints, API keys and an OpenAPI specification. | This contradiction makes automation/integration readiness unverified and is a serious procurement and product-reliability warning. Verify against live authenticated behaviour before basing any roadmap on API use. |
| Legal/formality | PCT Rule 11 and national rules have measurable requirements, while acceptability also depends on disclosure, claim scope and examiner judgement. | Formal validation can be valuable; “filing-ready” and “compliant” must be qualified by rule profile, evidence and human review. |

Sources: [pricing](https://patentfig.ai/pricing), [trust centre](https://patentfig.ai/trust), [developer guidance](https://patentfig.ai/developers), [API quick start](https://patentfig.ai/docs), [PCT Rule 11](https://www.wipo.int/en/web/pct-system/texts/rules/r11).

## Expected benefits

1. **Direct cost and cycle-time reduction.** The product can shorten the hand-off loop among inventor, attorney/agent and illustrator: source intake → draft set → corrections → format/export. The savings are strongest in repeatable utility, design, mechanical, diagram and correction work.
2. **Lower formal-defect risk.** Deterministic checks for sheets, margins, image properties, labels and numbering offer clearer value than generative novelty. They are testable, auditable and reusable across cases.
3. **A credible B2B wedge.** Firms and in-house teams value project controls, confidentiality, repeatability, approval history and export manifests. These needs are less price-sensitive and more defensible than a commodity image endpoint.
4. **Compounding data asset without training on customer content.** A permissioned, anonymised corpus of rule outcomes, correction patterns and evaluation fixtures can improve validation quality and product workflows without using customer inventions to train a model.
5. **Expansion revenue.** Once the project/revision/rules graph exists, utilities (conversion, vectorization, DPI), review seats, API/automation, secure storage, office profiles and enterprise governance can attach naturally.

## Main risks and the required response

| Risk | Severity | Why it matters | Required mitigation / validation |
| --- | --- | --- | --- |
| False confidence or legal harm | Critical | A visually plausible figure can omit structure, alter claim scope, conflict with the description, or fail a local formality requirement. | No acceptance guarantee; show rule/version/evidence; enforce reviewer sign-off; retain source/revision lineage; use counsel-reviewed language. |
| Generated technical inaccuracy | Critical in medical, biotech, semiconductor, circuit and safety domains | Image generation may invent geometry, connections, anatomy or process details that a technical reviewer rejects. | Start with deterministic source transformation and human editing; mandate domain review packs and abstention for low confidence; do not auto-publish output. |
| Confidentiality / trade-secret exposure | High | Inputs are often pre-filing invention disclosures. A single supplier/security failure can destroy trust. | Tenant isolation, no-training terms that are technically enforceable, processor diligence, retention/deletion proof, customer-controlled exports and enterprise security review. |
| Rule drift and jurisdictional complexity | High | Requirements vary by office, application type and effective date; “all offices” positioning is fragile. | Versioned rule profiles with official citations and effective dates; launch with PCT + one office; formal change management and regression fixtures. |
| Weak differentiation / price pressure | High | General image models, CAD tools, diagram software and low-cost services can all create an image. | Compete on traceability, cross-figure consistency, editing, rule evidence and reviewer workflow, not raw generation quality alone. |
| Unit economics | High, unmeasured | Credits hide inference, storage, support, vectorization and human-review costs; complex cases may need many reruns. | Meter every job; capture cost/figure and cost/approved-export; cap/retry intelligently; price by workflow value rather than just pixels. |
| Professional adoption | Medium-high | Attorneys may distrust opaque output and illustrators may see displacement risk. | Position it as controlled first draft + review packet; let illustrators be reviewers/editors; measure review minutes and correction rates. |
| Integration/API uncertainty | Medium-high | The competitor’s public docs contradict its developer page; automations cannot be assumed. | Design our system API-first, but treat competitor APIs as unavailable until authenticated contract tests succeed. |
| Asset/IP provenance | Medium | Uploaded CAD, screenshots, third-party images and generated output can have rights restrictions. | Source-asset classification, user attestation, audit log, and a clear policy for third-party reference material. |
| Scope explosion | High | The page taxonomy covers many verticals, yet each needs specialised visual and reviewer rules. | One platform, reusable templates; do not launch every vertical. Gate each industry pack on expert fixtures and pilot evidence. |

## Return profile by strategic option

| Option | Return potential | Risk / capital intensity | Judgment |
| --- | --- | --- | --- |
| Generic prompt-to-patent-image SaaS | Low-to-medium | High commoditisation and high error liability | Do not pursue as the core business. |
| Utilities only: convert, DPI, vectorize | Medium | Lower legal risk but low switching cost | Good acquisition/on-ramp, weak standalone moat. |
| Formal checker with cited rule profiles | Medium-to-high | Rules maintenance and false-positive risk | Build early; it earns trust and supports every later workflow. |
| Review-led figure workbench for firms/in-house IP | High | Higher implementation, procurement and UX burden | Recommended core bet. |
| Fully autonomous multi-jurisdiction filing automation | Potentially high | Unacceptable near-term legal, rule-drift and integration risk | Defer. |

## Smallest investable validation

Run a closed pilot with three distinct reviewer profiles: a patent illustrator/formalities specialist, a patent attorney/agent, and a technical reviewer from one target vertical. Use anonymised historical matters and compare the existing process to PatentDraw for:

- time to a reviewer-accepted figure set;
- number and severity of formality findings before export;
- numeral/specification inconsistencies found;
- reviewer edits caused by generated technical inaccuracy;
- cost per approved export and per useful correction;
- whether the team would use it again on a live matter.

Pass only if the tool reduces preparation/review effort **without increasing material technical or scope-correction events**. A single serious unnoticed error in a pilot should block expansion into that domain until the workflow or rule pack is changed.

## Investment gates

Fund the next build phase when all gates are true:

1. At least two design partners agree to a supervised pilot and a paid-conversion conversation.
2. PCT plus one target office has a cited, versioned, regression-tested rules profile.
3. The workspace preserves immutable originals, revision diffs, numbered-feature provenance, reviewer decisions and export manifests.
4. A security review validates processing locations, subprocessors, access controls, retention/deletion and the no-training policy.
5. Pilot economics show a sustainable margin after inference, storage, support and required human-review time.

## What would change the recommendation

Move to **do not invest** if design partners will not entrust anonymised real work, formal checks do not save measurable review time, or security/procurement cannot support confidential pre-filing assets. Move to **accelerate** if firms consistently pay for the rule-evidenced review/export workflow even while treating generation as a replaceable draft tool.
