# Product Design QA — Evidence Canvas Studio

## Comparison target

- Source visual truth: `/Users/corlin/.codex/generated_images/019fb666-f827-7113-a0f9-396bdd1196d2/exec-5f578f01-4cc6-4e88-9523-4caac6104321.png`
- Final implementation capture: `/Users/corlin/PatentDraw/artifacts/design-qa/implementation-final.png`
- Source pixels: 1487 × 1058 PNG.
- Implementation pixels: 1440 × 1024 browser capture.
- CSS viewport: 1440 × 1024 at devicePixelRatio 1.
- Density normalization: source resized to 1440 × 1024 as `artifacts/design-qa/source-normalized.png`; implementation captured at the same CSS size and DPR.
- State: FigurePlan has been generated from one authorised fixture source and is awaiting explicit drafter confirmation. Export remains locked.

## Evidence

- Full-view comparison: `artifacts/design-qa/comparison-final.png`.
- Focused canvas comparison: `artifacts/design-qa/comparison-canvas.png`.
- Focused inspector comparison: `artifacts/design-qa/comparison-inspector.png`.
- Independent SVG handoff state: `artifacts/design-qa/implementation-revision-state.png`.
- First implementation capture: `artifacts/design-qa/implementation-v1.png`.

The full view confirms the same four-region hierarchy as the selected design: project header, causal stage rail, dominant patent canvas with evidence drawer, and fixed review inspector. Focused comparisons were required because the source-mapping table, warning boundary, primary action, canvas toolbar, and evidence columns were not legible enough in a half-width full-view comparison.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation uses Inter with Noto Sans SC/PingFang SC fallbacks, matching the source's compact technical sans hierarchy. Inspector rows were increased from 10.5px to 11px after the first pass; headings, labels, statuses, and primary action now retain the source hierarchy without clipping.
- Spacing and layout rhythm: the 210 / fluid canvas / 438 grid preserves the source proportions at 1440 × 1024. Canvas controls, evidence drawer, warning block, and CTA remain visible in the target state. At 1280 × 800 there is no horizontal overflow (`scrollWidth 1265` within a `1280` viewport); the lower CTA is reachable through the inspector's intended vertical scroll.
- Colors and tokens: neutral white/graphite surfaces, teal valid/primary states, amber review states, and red boundary warnings map closely to the source. Borders remain 1px with restrained 7–8px radii and minimal elevation.
- Image quality and asset fidelity: the canvas uses a dedicated 1400 × 900 generated pump-section patent figure asset, not CSS art, an inline SVG, or a placeholder. It preserves black linework, section hatching, leader lines, reference numerals, and FIG. 1 labeling. The subject is wider than the concept drawing, but the crop, scale, legibility, and mechanical patent-figure art direction are equivalent and intentional.
- Copy and content: app-specific text preserves the real repository contracts. “已映射” intentionally replaces the concept's stronger “已通过”, and only source-backed rows are shown as mapped; supplemental reference signs are “建议 / 需核对”. The AI draft, independent SVG, legal-approval, and export boundaries remain explicit.
- Icons: all visible interface icons come from the Phosphor outline family. There are no emoji, handcrafted SVGs, glyph substitutes, or mixed icon families.
- Accessibility: semantic landmarks, table roles, status/alert text, focus-visible outlines, image alt text, explicit disabled states, and unique zoom-control accessible names are present. Contrast is sufficient for primary text and semantic states.

## Comparison history

### Iteration 1 — blocked

Evidence: `artifacts/design-qa/comparison-v1.png` and `artifacts/design-qa/implementation-v1.png`.

- P2 accessibility: two zoom controls exposed the same accessible name “放大”. Fixed by separating them into “框选放大” and “提高缩放级别”.
- P2 behavior: the completed independent-SVG action still looked actionable although no later rule-check endpoint exists. Fixed by disabling the completed button and retaining the explicit “待规则检查” next state.
- P2 readability: inspector mapping rows and the mapping disclaimer were smaller than the source's functional text. Increased their type sizes while keeping all rows and the CTA within the inspector.

### Iteration 2 — passed

Evidence: `artifacts/design-qa/comparison-final.png`, `artifacts/design-qa/comparison-canvas.png`, and `artifacts/design-qa/comparison-inspector.png`.

The fixes are visible in the final capture. No remaining P0/P1/P2 mismatch changes the selected design's hierarchy, workflow, readability, or core behavior.

## Primary interactions tested

- Automatic source-grounded FigurePlan load from the local API.
- “确认 FigurePlan 并生成草图” advances to a ready non-authoritative draft.
- “将草图设为参考” changes only the draft selection state.
- “创建独立 SVG 修订” creates the independent canonical revision handoff.
- Stage rail and export requirements update after each transition; export remains locked.
- Evidence drawer expands/collapses.
- Version menu opens and exposes only currently eligible versions.
- Zoom control changes 92% to 97%.
- Fresh browser session console: 0 warnings, 0 errors.
- Web typecheck, production build, and all 50 tests pass.

## Follow-up polish

- P3: when deterministic rule-check APIs are implemented, replace the disabled completed CTA with the real “运行规则检查” transition and retain the same state model.
- P3: add a narrow-desktop compact inspector mode below 1180px if the product later needs tablet-class support; this desktop workbench currently sets an intentional 1180px minimum width.

## Final result

final result: passed
