# PatentDraw MVP: utility figures with SVG export

**Decision:** build a single, controlled workflow for **utility patent drawings** with a PCT Rule 11 baseline and two versioned local profiles: **USPTO utility** and **CNIPA invention/utility-model**. SVG is a first-class editable master and download format, not an automatically approved filing format. AI may create source-linked figure-plan proposals and non-authoritative draft assets, but cannot create a final figure, pass a rule, approve an export or assert filing status. For CNIPA, the MVP also records the declared electronic-filing route and externally produced XML-package evidence; it does not generate or submit XML.

## Problem and users

A patent drafter needs to turn an existing line drawing, PDF page, raster image or vector source into a revised, numbered utility figure set, detect predictable formality defects, and hand a reviewer an export package with provenance.

Primary users: patent drafter/illustrator, patent attorney or agent, and technical reviewer. The inventor may upload source material but cannot approve a project for export alone.

## In scope

1. Projects, source assets and one or more utility-figure revisions.
2. Import PNG, JPEG, TIFF, PDF page images and SVG; preserve the immutable original and cryptographic hash.
3. One figure-plan mode: overview, elevation, section, exploded view, detail view, block diagram or flowchart. No automatic claim-scope inference.
4. A vector-capable editor: page/safe-area overlays, figure labels, numerals, leader lines, crop/rotate/scale, stroke width, monochrome/hatching style and revision comparison.
5. Project-wide numeral registry and a reviewer-confirmed link from each numeral to a specification term.
6. PCT Rule 11 / USPTO / CNIPA formality checks selected by a named, effective-dated profile.
7. Exports: sanitized SVG editable master, PDF review/export copy, PNG/TIFF filing-raster candidate, and JSON/PDF audit manifest.
8. Roles: contributor, drafter, technical reviewer, attorney/agent approver and organisation admin.
9. For CNIPA only, route-aware electronic-filing readiness assessment: record the requested examination route and, when supplied, the identity, version, preview/proofread confirmation and hash of an XML package produced outside this MVP.
10. Opt-in AI assistance: source-linked FigurePlan proposals, candidate annotation suggestions and draft line-art images after user confirms the source authority, figure purpose and allowed scope.

## Explicitly out of scope

- design, plant and trademark profiles; any jurisdiction beyond USPTO and CNIPA;
- autonomous final-figure generation, source/claim inference, rule approval, legal/technical correctness determination, CAD-native solid modelling, netlist validation, and clinical/chemical correctness;
- CNIPA XML generation, CNIPA electronic submission, legal advice or an office-acceptance prediction;
- enterprise SSO/SCIM, public API, batch conversion and payments.

## SVG contract

### Source import

- Accept SVG 1.1/2.0 only after sanitisation. Reject scripts, event handlers, external URLs, embedded foreign objects, animation, unbounded filters, file links and unsupported raster/data payloads.
- Store the original source separately. Render a safe preview from a sanitized derivative; never alter the original without a new revision.
- Parse and report `viewBox`, width/height/unit, element count, text-versus-outline status, external dependency attempt, raster embeds, transparency and unsupported elements.

### Editable master

- Each revision owns a canonical SVG with `viewBox` in millimetres and explicit `width`/`height` in `mm` for the selected sheet (A4 or US Letter).
- Maintain named groups: `sheet`, `figure-content`, `hatching`, `leaders`, `reference-signs`, `figure-labels`, `annotations`. Do not depend on CSS, JavaScript, external fonts or external images.
- Preserve only standard paths, lines, polylines, polygons, rect/circle/ellipse, text and explicit transforms after normalisation. Record every destructive flatten/outline operation in the revision audit event.
- For safe, deterministic PDF/TIFF/PNG rendering, embed approved fonts or convert only approved export-copy text to paths, retaining a text-bearing editable SVG master.

### SVG download

The product offers `Download SVG master` only after sanitisation and pre-export validation. The manifest must say: selected rule profile/version, page size, source revision, exported SVG hash, live-text/outlined-text status and unresolved warnings.

**Filing boundary:** SVG is not labelled “USPTO-ready” or “CNIPA-ready.” Current USPTO Patent Center guidance states that SVG images are not supported in multi-section DOCX documents and advises conversion to non-vector graphics in that context. The MVP therefore treats SVG as the editable/provenance format and supplies separately validated PDF or raster export candidates for review. From 2026-01-01, CNIPA requires XML for electronic patent files and no longer accepts non-XML electronic files; the official list expressly includes description drawings. SVG remains a source/master asset, never a CNIPA XML package. [USPTO Patent Center](https://www.uspto.gov/patents/apply/patent-center?MURL=PatentCenter), [USPTO PDF guidelines](https://www.uspto.gov/patents/apply/applying-online/efs-web-pdf-guidelines), [CNIPA comprehensive XML notice](https://www.cnipa.gov.cn/art/2025/11/12/art_75_202551.html), [CNIPA XML file list](https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=9ee3f4035a3c4c73983da5438d70cb6b.pdf&showname=%E5%BA%94%E5%BD%93%E4%BB%A5XML%E6%A0%BC%E5%BC%8F%E4%B8%8A%E4%BC%A0%E6%8F%90%E4%BA%A4%E7%9A%84%E4%B8%93%E5%88%A9%E7%94%B5%E5%AD%90%E6%96%87%E4%BB%B6%E6%B8%85%E5%8D%95.pdf)

## Core workflow

1. **Create project:** select `utility`, profile `PCT-Rule-11 + USPTO` or `CNIPA-2026.1`, sheet size and confidentiality classification. For CNIPA, record the application date and declare whether the intended route is standard, priority examination, fast examination, PPH, delayed examination, concentrated examination or PCT national phase.
2. **Import source:** store original, produce safe preview and importer report; user acknowledges source authority and rights.
3. **Plan figure:** enter figure ID, title/purpose, view type and specification references. A missing reference forces `manual-review-required`.
4. **Optionally request AI proposals:** select only confirmed sources, proposed assistance type and allowed figure scope. A source-unlinked request, model refusal or unsupported inference returns `manual-review-required`.
5. **Confirm plan and choose draft:** a drafter reviews the AI FigurePlan/draft, accepts, rejects or edits it. An accepted plan is not an approved figure.
6. **Edit revision:** make vector/raster edits; assign numerals and leader targets through the registry. An AI image remains a source-linked `GeneratedDraftAsset` until a drafter creates a canonical SVG revision.
7. **Run checks:** classify each result as `pass`, `warning`, `manual-review-required` or `fail`, with rule ID, evidence geometry and remediation text.
8. **Review:** technical reviewer confirms structural correspondence; attorney/agent approves or rejects the export candidate.
9. **Assess CNIPA e-filing evidence:** for a CNIPA route, state that an electronic filing needs an XML package. An XML package supplied from an external official/authorised tool can be recorded with package hash, tool/version, preview/proofread attestation and reviewer decision; the MVP neither generates nor transmits it.
10. **Export:** issue SVG master plus chosen PDF/PNG/TIFF candidate and a signed audit manifest. The manifest is `not-CNIPA-electronic-submission-ready` by default; a complete external XML record changes only to `CNIPA-XML-evidence-recorded`, never to an acceptance or submission-ready claim. Any edit invalidates dependent checks and approvals.

## Rule-pack MVP

Implement only rules whose inputs and result can be made explicit. Each rule has `id`, `profile`, `effective_from`, `source`, `input_schema`, `predicate_or_review_policy`, `severity`, `evidence_renderer`, `fixture_ids` and `owner`.

| Check family | Automated result | Human gate |
| --- | --- | --- |
| A4/Letter, usable area, blank margins, orientation | deterministic geometry | exception approval |
| figure/sheet labels and sequence | deterministic registry/layout | figures needed for disclosure |
| black/white, alpha/transparency, raster dimensions, resolution metadata | deterministic asset analysis | colour exception/petition decision |
| numeral uniqueness, numeral-to-term mapping, leader target/collision | deterministic + layout heuristic | correspondence to claims/description |
| minimum text size, overflow, hatching/line crossings, reduction preview | geometry/rendering check | legibility and drafting quality |
| photographs, text indispensability, technical correctness, cross-figure correspondence, AI source grounding | `manual-review-required` | named reviewer decision |

### AI-assisted figure-plan and draft overlay

AI is an opt-in assistant, not a source of technical truth. It may propose a FigurePlan,
annotation or draft image only from user-authorised project sources and an already stated figure
purpose. Every `AiRun` records model/provider/version, instruction version, selected source hashes,
consent state, output hashes, time, actor, limitation notices and a source-to-proposal mapping.
The product records `abstained` rather than inventing content when required sources are absent,
contradictory or not mapped to a proposed element. A generated image is never an editable master;
it must be chosen, redrawn or otherwise converted by a drafter into a separately reviewed canonical
SVG revision.

| Rule ID | Constraint implemented | System result |
| --- | --- | --- |
| `AI-FIG-001` | A FigurePlan proposal identifies its figure purpose, view type, source references, candidate components, allowed reference signs, suggested section/detail relationship and open questions. | Schema/source-link validation; missing or unsupported information is `manual-review-required`. |
| `AI-FIG-002` | AI may not assert claim coverage, technical correctness, legal sufficiency, formality pass, office acceptance or filing status. | Block forbidden result types/labels and require named human decision. |
| `AI-FIG-003` | Every draft asset and proposal must retain consent, model/version, instruction, source and output provenance. | Missing provenance prevents use in the canonical-revision workflow. |
| `AI-FIG-004` | An AI proposal must abstain or request review when it cannot map a proposed component/view/annotation to selected source material. | `abstained` or `manual-review-required`; no automatic completion. |
| `AI-FIG-005` | A change to selected source, FigurePlan, canonical SVG or the allowed scope invalidates dependent AI mappings and reviewer decisions. | Deterministic invalidation event and renewed human review. |

### CNIPA-2026.1 figure profile

**Authority and effective date.** Effective 2026-01-01, this profile incorporates CNIPA's
2023 *Patent Examination Guidelines* (Order No. 78, effective 2024-01-20), Part I,
Chapter 2, §7.3, as the currently applicable drawing text together with the 2023 Implementing
Regulations and the 2026 amendment decision (Order No. 84). Order No. 84 does not amend
Part I, Chapter 2, §7.3; therefore `CNIPA-FIG-001` through `CNIPA-FIG-009` are substantively
unchanged. It applies to invention/utility-model description drawings. It is not an
electronic-filing format certification or a legal opinion. [CNIPA Order No. 78](https://www.cnipa.gov.cn/art/2023/12/21/art_99_189202.html), [CNIPA Guidelines, §7.3](https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=5753f257e6a04b6f8e305eb6d34ba452.pdf&showname=%E4%B8%93%E5%88%A9%E5%AE%A1%E6%9F%A5%E6%8C%87%E5%8D%97.pdf), [CNIPA Order No. 84](https://www.cnipa.gov.cn/art/2025/11/13/art_99_202568.html), [CNIPA Regulations (2023)](https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html?siteId=qingdao)

| Rule ID | CNIPA constraint implemented | System result |
| --- | --- | --- |
| `CNIPA-FIG-001` | Engineering blueprints and photographs are prohibited; drawings must be made with drawing tools, have clear uniform lines, have no alterations, and no irrelevant border. Drawings are normally black; colour is an exception where needed to explain technical content. | deterministically flag known source type, active edit marks, external frame and non-monochrome content; photo/blueprint appearance is a vision heuristic requiring confirmation. Colour becomes `manual-review-required`, not an automatic reject. |
| `CNIPA-FIG-002` | Figures are consecutively numbered with Arabic numerals as `图1`, `图2`, etc., placed directly below the corresponding figure. | deterministic label grammar and below-figure placement check. |
| `CNIPA-FIG-003` | Figures are normally upright and clearly separated. If a transverse figure is necessary, its top is on the sheet's left; if one figure on a multi-figure sheet is transverse, all figures on that sheet are transverse. | deterministic orientation/layout check with a reviewer-confirmed necessity exception. |
| `CNIPA-FIG-004` | Size and clarity must preserve every detail after reduction to two-thirds and support copying/scanning. | deterministic 2/3 rendering preview plus `manual-review-required` for visual legibility. |
| `CNIPA-FIG-005` | The same component must use the same reference sign across drawings and the description; a sign cannot appear only in the drawing or only in the description. | registry and cross-document reconciliation check. |
| `CNIPA-FIG-006` | Only indispensable annotations are permitted; words are Chinese, with an original-language term optionally in following parentheses. | text-density/Chinese-character check plus reviewer decision for indispensability and translation. |
| `CNIPA-FIG-007` | Structure, logic and process-flow diagrams contain necessary wording and symbols inside their blocks. | diagram-template completeness check; semantic adequacy remains human review. |
| `CNIPA-FIG-008` | One figure uses a consistent scale; a separate enlarged detail may be added. The drawing set must show the claimed product's shape, structure or their combination, not only prior art or effect/performance graphs. | scale-consistency geometry check; product-disclosure and claimed-feature coverage are `manual-review-required`. |
| `CNIPA-FIG-009` | Description-drawing sheets use consecutive Arabic page numbers. | deterministic sheet-number sequence and placement check. |

### CNIPA-2026 electronic-filing readiness overlay

This overlay is operational policy, not a figure-content rule. It is evaluated only after the
user declares a CNIPA filing route and does not alter `CNIPA-FIG-001` through
`CNIPA-FIG-009`.

| Rule ID | Policy condition | System result |
| --- | --- | --- |
| `CNIPA-XML-001` | From 2026-01-01, CNIPA requires XML for electronic patent files and does not accept non-XML electronic files. The listed scope includes Chinese invention/utility-model applications and PCT national-phase files. | A CNIPA electronic-filing workflow without external XML-package evidence returns `manual-review-required` and labels every product export `not-CNIPA-electronic-submission-ready`. |
| `CNIPA-XML-002` | CNIPA's mandatory XML list expressly includes `100003` description drawings and specified PCT amended-description-drawing files. | Treat SVG/PDF/PNG/TIFF as drawing assets only; never present any as a CNIPA electronic-file substitute. |
| `CNIPA-XML-003` | XML files must meet CNIPA data standards; CNIPA provides conversion tools and requires applicants/agents to check file accuracy and completeness. | An external XML evidence record must include route, package hash, converter/tool version, standard version, preview/proofread attestation, timestamp and named reviewer. Missing information is `manual-review-required`. |

The profile records guideline section, source URL, effective date, rendering input and result
on every `RuleRun`. Rule text and a source snapshot hash are stored at the versioned profile,
not inferred from an LLM.

## Minimum data/API shape

`Project`, `SourceAsset`, `FigurePlan`, `AiRun`, `GeneratedDraftAsset`, `FigureRevision`, `SvgDerivative`, `ReferenceTerm`, `RuleProfile`, `RuleRun`, `CnipaEfilingEvidence`, `ReviewDecision`, `ExportPackage`.

Every revision and export includes immutable IDs, parent/source IDs, content hashes, actor/time, rule-run IDs, approval IDs and a disclosure that it is an internal review state. An `AiRun`/`GeneratedDraftAsset` records an immutable request-input hash, provider/model/version, instruction version, selected-source hashes, consent state, output hash, source mapping, limitations and actor/time; it has no approval power. A `CnipaEfilingEvidence` record holds the application date, declared route, policy-effective date, XML-package status, package hash where supplied, converter/tool version, standard version, preview/proofread attestation and named reviewer; it never makes an office-acceptance claim. An official-system receipt may be stored only as user-supplied evidence and is the only record that can establish a filing event. Internal endpoints may be implemented, but no public API is part of this MVP.

## Acceptance suite

Before pilot, create 29 authorised or fictional fixtures:

- 4 clean SVGs: mechanical elevation, section, exploded view and flowchart;
- 4 malformed/unsafe SVGs: script, external reference, unsupported filter and broken `viewBox`;
- 4 common formality failures: margin intrusion, tiny numeral, transparency/colour and crossed leaders;
- 4 CNIPA-profile failures: photo/blueprint-like input, `图` label above a figure, a mixed-orientation sheet, and a non-Chinese nonessential annotation;
- 3 ambiguous figures: text necessity, technical correspondence and dense complex section, all required to return `manual-review-required`;
- 4 CNIPA electronic-filing fixtures: a 2026 electronic route without XML evidence, a complete externally produced XML-evidence record, an XML record mismatched to the figure revision, and an XML record missing proofread attestation.
- 6 AI-assistance fixtures: two grounded FigurePlans, a source-unlinked request, a model refusal, a hallucinated component proposal, and a source/plan edit that invalidates the AI mapping.

Pass criteria: imports are non-destructive; unsafe SVG never executes or retrieves external content; the same canonical SVG produces repeatable hashes and rendering results; every output includes its manifest; a changed numeral or path invalidates dependent rule runs and approval; an unverified CNIPA XML state is never labelled electronic-submission-ready; no AI fixture can create a canonical SVG, pass a rule, grant approval or make a filing assertion without the required independent workflow gates.

## Release gate

Run a supervised pilot on deidentified matters with a drafter, attorney/agent and technical reviewer. Release only if the workflow reduces preparation/review time without an increase in material source-to-figure or numeral-to-description discrepancies. AI assistance additionally requires evidence that source-grounded plans reduce drafting effort without increasing hallucinated components, unsupported annotations or reviewer rejection. A consumer-facing filing claim, new jurisdiction or autonomous final-figure function is deferred until it has its own rule pack, fixtures and pilot evidence.
