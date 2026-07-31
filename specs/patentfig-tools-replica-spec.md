# Patent drawing workbench: replication specification

**Status:** product and functional specification, derived from public inspection on 2026-07-31.
**Purpose:** recreate the useful product behaviour exposed by `patentfig.ai/tools`, while making reviewability, office-specific rules, and domain-expert controls first-class. This is not a claim of legal sufficiency or filing acceptance.

**Build authority:** the broad capability map in this document remains a product horizon. The approved implementation scope is [`mvp-utility-svg-spec.md`](mvp-utility-svg-spec.md): utility drawings only, PCT Rule 11 baseline plus USPTO profile, and SVG editable-master/export support.

## 1. Evidence boundary

The inspected public product presents a hub that routes users by **filing type**, **source material**, **figure type**, **industry**, **software/comparisons**, **post-processing**, and **references**. Public pages advertise: text/image/CAD generation; utility and design view sets; diagrams; figure checking; vectorization; resolution enhancement; and format conversion. The accessible generator is a read-only demo: it shows an anchor, line-art and rendering groups, versioned figures, per-figure expand/download/regenerate controls, and an export-all action. Authentication is required to leave the demo or execute credit-consuming work.

Observed public tool controls include the following:

| Surface | Verified public controls/claims | Replica interpretation |
| --- | --- | --- |
| Figure checker | utility/design choice; PNG/JPEG/TIFF/WebP input; 10 MB limit; formal checks for DPI, format, colour, text, line art, margins, numerals and lead lines; 20-credit gate | build a rule-engine report, with evidence overlays and rule versioning |
| Vectorize | PNG/JPEG/TIFF/WebP input; DXF/SVG/PDF output; "line-art redraw" and "faithful trace" modes; 20-credit gate | keep both vector provenance and editable result, never silently replace source |
| DPI enhance | PNG/TIFF output; 2K/300 DPI and 4K/600 DPI choices; single-image operation; 20-credit gate | treat resolution metadata, physical sheet size, and actual pixel density as separate values |
| Generator | Custom/Product/Logic modes; anchored multi-figure project; line art/rendering groups; revisions/download/export-all | implement a project workspace rather than a one-shot image prompt |

The pages are a marketing and unauthenticated-product surface. Generation quality, actual upload processing, supported offices beyond publicly stated ones, billing implementation, and authenticated editing are **not verified** and must not be copied as presumed behaviour.

## 2. Product outcome and guardrails

Create a patent-figure workbench that turns an inventor's text, reference images, CAD views, screenshots, or existing figures into a **traceable figure set** that a drafter, attorney, and subject-matter reviewer can edit and validate before export.

It must:

- make the filing office, application type, subject matter, and intended claim scope explicit before generation;
- preserve input, prompt, model/version, derived asset, human edit, and validation provenance;
- distinguish `formal-pass`, `warning`, `manual-review-required`, and `not-evaluable`; never show a generic "filing-ready" claim;
- require the user to confirm correspondence against the specification and claims, because an image model cannot establish enablement, support, novelty, or claim scope;
- use current, versioned office rules. PCT Rule 11 is the portable baseline for pages, margins, line work, text, figure/reference numbering and cross-reference consistency; local-office profiles may only override it with a cited, effective-date-stamped source. [WIPO Rule 11](https://www.wipo.int/en/web/pct-system/texts/rules/r11), [USPTO 37 CFR 1.84 in MPEP](https://mpep.uspto.gov/RDMS/MPEP/print?href=d0e44626.html&version=e8r9), [EPO drawings guidance](https://www.epo.org/en/legal/guidelines-epc/2025/a_ix.html)

## 3. Information architecture

### Public acquisition layer

1. `/tools` — filterable directory, not a flat SEO-card grid.
2. Workflow landing pages — source-specific, filing-specific, diagram-specific, industry-specific, and utility pages. They preselect a reusable project template and explain capability limits.
3. Rules library — office profile comparison, rule source links, effective date, exceptions, and examples.
4. Example library — fictional, labelled examples with input, intended figure plan, output, and known review notes.
5. Trust, pricing, API and developer surfaces — separate commercial/security information from technical drawing review.

### Authenticated workbench

```
Projects → Intake & source dossier → Figure plan → Generate / Edit
         → Domain review → Formal validation → Export package → Audit history
```

Primary navigation: **Projects**, **Create**, **Review queue**, **Rules**, **Assets**, **Exports**. The project page has a left figure tree, centre canvas/compare view, and right inspector. Avoid the replica's marketing-route duplication: every landing page routes into one parameterized workflow rather than a separate implementation.

## 4. Core objects and state

| Object | Required fields |
| --- | --- |
| Project | title, jurisdiction profile/version, filing type, technology tags, confidentiality policy, owner/team, status |
| SourceAsset | immutable original, hash, source type, dimensions/units, importer warnings, licence/confidentiality classification |
| FigurePlan | figure ID/title, purpose, claim/spec references, required view, projection, dependencies, reviewer, planned status |
| FigureRevision | parent revision, source lineage, generation/edit recipe, editable vector/raster assets, reference-numeral map, author, approval state |
| ReferenceTerm | numeral, canonical feature name, aliases, first figure, description/claim citations, allowed figure occurrence |
| RuleProfile / RuleRun | office, filing type, effective date, source URL, rule ID/version, inputs, result, confidence, evidence geometry |
| ExportPackage | target office, selected revisions, sheet order, file formats, manifest/checksum, rule-run IDs, human sign-offs |

State machine: `draft → planned → generated → domain-reviewed → formal-reviewed → approved-for-export → exported`; rejection or edit returns the affected figure and dependent validations to `draft` or `generated`. “Approved” is an internal workflow state, not an office acceptance prediction.

## 5. End-to-end flows

### A. New utility application

1. Select office/profile and utility application; enter invention summary, claims/spec references, required language, and confidentiality handling.
2. Produce a figure plan: overview, orthographic views, section, exploded/detail views, and method/system figures only where disclosure needs them.
3. Create from text, reference image, CAD, or existing line art. The system asks for one view per request and presents ambiguity warnings rather than inventing hidden structure.
4. Assign and lock a project-wide numeral registry; reconcile every numeral to the description.
5. Edit line art and labels; compare original, generated and current revision.
6. Run structural/domain review then formal profile validation; resolve findings or record an exception rationale.
7. Export an office-profiled package plus a review manifest.

### B. Design application

Collect claim scope before drawing: claimed portions, unclaimed environment, surface treatment, colour intent, and view completeness. Generate/ingest front, rear, left, right, top, bottom, and perspective where needed. Enforce cross-view geometry checks, consistent solid/broken line semantics, consistent shading, and the default absence of utility-style reference numerals/leader lines. The approval screen explicitly asks whether every visible solid-line feature is intended to be claimed.

### C. Existing-figure correction

Upload an office notice and drawing set. Parse the notice only as a proposed issue list, map each issue to a rule/finding, create a corrected revision without overwriting the filed image, rerun checks, and export a diff packet: original, corrected, change log, rule results, and drafter acknowledgement.

### D. Batch conversion / vectorization / enhancement

Batch operations create child revisions, never destructive replacements. Before output, display: source and target pixel dimensions, physical size, DPI metadata, colour channels, alpha/transparency, bit depth, compression, vector element count, text outlines versus live text, and all profile findings. Permit a batch only when every file has an individually reviewable result.

## 6. Functional requirements

### 6.1 Intake and generation

- Accept text, PNG/JPEG/TIFF/WebP, PDF page rasterization, SVG/DXF where safely parsable, and CAD exports. Reject unsupported or malformed files with actionable reason codes.
- Offer templates for utility mechanical, design, circuit, block diagram, flowchart, software architecture, medical device, semiconductor section, biotech/lab, chemical apparatus, robotics, IoT, automotive, and trademark drawings.
- Build a figure plan before multi-figure generation; show coverage gaps and duplicate viewpoints.
- Generation must expose structured controls: figure type, view/projection, section plane, exploded relationships, style, line convention, label policy, solid/broken/shading policy, desired numerals, and source constraints.
- Store a declarative generation recipe and allow a revision-specific change request. “Regenerate” always creates a sibling revision with a visible diff.

### 6.2 Editor and consistency engine

- Canvas supports sheet bounds, safe/usable area overlays, scale, crop, rotation, vector/raster layers, line width, hatching, leader-line routing, labels, figure labels, and design broken-line styling.
- Numeral registry detects duplicate meaning, same-feature/different-numeral, dangling numeral, numeral absent from description, and description term absent from figures.
- Cross-figure relationships: shared geometry anchors, named camera/projection, alignment guides, and a reviewer-confirmed consistency result. Do not claim a probabilistic visual comparison proves consistency.
- Provide side-by-side, onion-skin and revision-diff views. Retain all approvals, comments, exceptions and exports in the audit log.

### 6.3 Compliance engine

Rules operate on explicit inputs and produce severity, confidence, evidence overlay, explanation, cited source and deterministic fix instructions. They must be versioned, testable and independently rerunnable.

Baseline checks: page/usable area/margins; sheet/figure numbering; output format; DPI calculated at declared physical sheet size; colour/grayscale/alpha; contrast; line continuity and thickness distribution; minimum glyph height; text density; figure-label grammar; reference-sign register; leader-line termination/crossing; orientation; hatching; figure spacing; and reproduction-at-reduction simulation.

The tool must differentiate machine-deterministic checks (e.g. pixel dimensions, transparent pixels, margins) from computer-vision heuristics (e.g. photograph-like content, line clarity) and human decisions (claim scope, indispensability of text, technical accuracy).

### 6.4 Export and review packet

- Profiled exports: page size, margins, numbering, image format/encoding, resolution, black-and-white conversion policy, and naming convention.
- Deliver original/source, chosen revision, editable master, filing raster/PDF, manifest JSON/PDF, rule results, exceptions, and integrity hashes.
- Block export only on hard technical failures selected by the profile; warnings and manual-review items require named sign-off with rationale.
- Provide a bilingual/translation-safe label inventory. Do not translate drawing labels automatically without showing the change and revalidating placement.

## 7. Examiner-oriented domain review packs

These are review aids, not automated substantive examination.

| Domain | Required questions and machine assists |
| --- | --- |
| Mechanical / automotive / robotics | Are interfaces, motion limits, force paths, section planes, fasteners and exploded relationships visible? Detect inconsistent orthographic silhouettes and unreferenced parts. Require human confirmation of kinematic correctness. |
| Electrical / circuits | Are symbols conventional, nets unambiguous, component identities legible, and signal/power/ground distinctions clear? Flag wire crossings, unlabeled junction ambiguity, and unsafe text density. Preserve a netlist or human-attested source; image inference is insufficient. |
| Software / AI / IoT | Separate system topology, data flow, control flow and deployment boundaries. Flag marketing verbs, excessive prose, and unlabeled interfaces. Require a claim-to-figure map and a technical-effect/implementation reviewer note; a diagram cannot cure an abstract idea problem. |
| Medical devices | Review anatomy versus device boundary, deployment state, sterile/safety-critical features, cross-sections, and labels that could be clinically misleading. Require a qualified human review; no clinical, regulatory or biocompatibility conclusion is inferred from a figure. |
| Biotech / lab / chemical apparatus | Distinguish apparatus/process drawings from chemical formulae, material conventions and process-flow symbols. Flag ambiguous fluid paths, missing valves/sensors, inconsistent hatching, and unverified biological structures. Do not synthesize experimental data or molecular structure claims from text. |
| Semiconductor | Require layer stack, material/hatching legend policy, process stage, contact/via continuity, scale disclaimer if needed, and cross-section/plan-view registration. Flag layer ordering conflicts and tiny labels after reduction. |
| Design / consumer electronics / trademark | Require claimed/unclaimed boundary, view set, consistent broken lines, shading convention and contour continuity. For trademarks, route to a separate mark-drawing profile and prevent utility/design conventions leaking into it. |

## 8. Non-functional, safety, and privacy requirements

- Tenant isolation, encryption in transit/at rest, granular project membership, immutable audit events, retention/deletion controls, and a no-training-by-default policy that is technically enforced and visible per asset.
- Signed URLs and malware/content scanning for uploads; strip active content from SVG/PDF before preview. Preserve the original separately.
- Accessibility: keyboard canvas alternatives, screen-reader names for controls/findings, non-colour-only severity, 200% zoom, and localized UI. Legal-rule translations retain original authoritative text and source link.
- Performance targets: local deterministic checks under 3 seconds/page; batch progress/cancellation; queued generative jobs; recoverable uploads; graceful partial-result handling.
- Model-risk controls: disclose model/tool version, prohibit silent geometry substitution, show source comparison, allow local/manual workflow, and send low-confidence or high-risk-domain jobs to mandatory human review.

## 9. Acceptance criteria and release gates

1. A project can import a mixed figure set, generate or edit revisions, create a registry, run an office profile, resolve findings, and produce an auditable export package without data loss.
2. Every finding links to a specific revision, geometry/text evidence, rule version and rerunnable input; deterministic findings have golden-file tests.
3. PCT baseline tests cover A4 usable area/margins, no frames, line/text/reproduction constraints, consecutively numbered figures, consistent reference signs, and prohibited/unnecessary text. [PCT Rule 11](https://www.wipo.int/en/web/pct-system/texts/rules/r11)
4. Design test fixtures prove: solid/broken line consistency, no accidental utility numerals, seven-view coverage reporting, and reviewer sign-off for claimed appearance.
5. Domain fixtures cover each review pack above, including deliberately ambiguous inputs that must result in `manual-review-required` rather than a pass.
6. Export tests verify physical dimensions/DPI, page geometry, clean output, manifest hashes, source-to-output lineage and reimport validity.
7. A pilot must include a patent illustrator, patent attorney/agent, and at least three technology-domain reviewers. Release is blocked until their corrections are represented as rule changes, workflow changes, or consciously documented non-automatable judgement.

## 10. Delivery sequence

**MVP:** use the scoped utility-drawing MVP, including SVG editable-master/export support, defined in [`mvp-utility-svg-spec.md`](mvp-utility-svg-spec.md).

**Next:** DXF support, batch utilities, further office-rule profiles with source governance, design cross-view guides, reviewer queue, comments/approvals, and API.

**Later:** domain packs, constrained generation, CAD geometry import, configurable organisation policies, verified rule updates, and enterprise deployment.

Do not put an unconstrained image generator ahead of the revision, review and rule-provenance layers. That order is what makes the resulting product credible to drafters and formalities reviewers.

## Appendix A. Public secondary-page inventory extracted from `/tools`

The following inventory is retained so that the replica preserves the site's routing intent but implements it as reusable templates rather than dozens of isolated features.

| Route family | Extracted secondary pages |
| --- | --- |
| Generate by task / filing | `patent-drawing-generator`, `ai-patent-drawing-generator`, `patent-figure-generator`, `utility-patent-drawing-generator`, `design-patent-drawing-software`, `provisional-patent-drawings`, `patent-application-drawings` |
| Generate from source | `photo-to-patent-drawing-ai`, `sketch-to-patent-drawing`, `screenshot-to-patent-drawing`, `product-photo-to-patent-line-art`, `cad-to-patent-drawing`, `multi-image-ai-generator` |
| Generate by figure | `patent-diagram-software`, `mechanical-patent-drawing-generator`, `electrical-patent-diagram-generator`, `circuit-patent-drawing-generator`, `exploded-view-patent-drawing-generator`, `medical-device-patent-drawing-generator`, `software-patent-diagram-generator`, `patent-flowchart-generator`, `patent-block-diagram-generator`, `ai-ml-patent-diagram-generator`, `trademark-drawing` |
| Industry | `robotics-patent-drawings`, `iot-patent-diagrams`, `semiconductor-patent-drawings`, `biotech-patent-drawings`, `chemical-apparatus-patent-drawings`, `consumer-electronics-patent-drawings`, `automotive-patent-drawings` |
| Workspace / alternatives | `patent-drawing-software`, `patent-illustration-software`, `patent-illustrator`, `best-patent-drawing-software`, `patent-drawing-services`, `patent-drawing-cost`, `patentfig-vs-pinch`, `patentfig-vs-patentdrawingai`, `patentfig-vs-smartdraw`, `patentfig-vs-deepip`, `patentfig-vs-patlytics`, `patent-drawing-software-for-law-firms`, `uspto-patent-drawings-online` |
| Process / correction | `figure-checker`, `uspto-patent-drawing-checker`, `fix-patent-drawing-rejections`, `convert`, `enhance`, `vectorize` |
| References / routing | `patent-drawing-examples`, `patent-drawing-requirements`, `patent-figure-numbering`, `patent-drawing-standards`, `patent-drawing-solution` |

The `convert` destination did not reliably resolve as a distinct public interactive surface during browser inspection; its advertised function is format conversion. Treat its exact UI and conversion matrix as **unverified**, and specify it only through the batch conversion flow above until authenticated product evidence is available.
