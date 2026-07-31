# Complex sectional patent figure: production notes

## Reference-image layout analysis

The provided sheet uses a single full-height longitudinal section as the primary disclosure vehicle. Its density is controlled by five reusable layout rules:

1. A vertical centreline is the compositional spine; the main shaft and nested rotating/flow components stack on it.
2. The enclosure is divided into functional zones from top to bottom, connected by a limited number of clearly drawn interfaces.
3. Cut solids use consistent diagonal hatching; voids, fasteners, bearings, coils and subassemblies retain distinct visual conventions.
4. Reference signs stay in exterior gutters and enter with short, mostly horizontal leaders. This preserves the internal section for geometry rather than annotations.
5. Callout density is asymmetric only where the assembly is asymmetric. The page still balances visually because the central section remains dominant.

## Production model for PatentDraw

Do not prompt directly for a dense drawing as a final deliverable. Produce it in five representations:

1. **Assembly graph** — parts, interfaces, axis/planes, material/cut state, and parent-child relationships.
2. **Section plan** — selected cutting plane, visible versus cut edges, zones, and centreline.
3. **Reference registry** — one stable numeral per semantic part, its target geometry and the specification term.
4. **Layout plan** — sheet, margins, figure label, external callout gutters, leader routing and collision rules.
5. **Rendered revision** — vector-first master plus a raster preview; every revision retains the upstream inputs.

This separation prevents the common generative failure where correct-looking hatching, labels and leaders obscure an incorrect or inconsistent assembly.

## Required automated checks

- Every numeral resolves once to a registry entry and a visible target; no leader crosses another leader or terminates in whitespace.
- Hatch regions are clipped to cut solids; adjacent distinct parts receive distinguishable hatch direction or spacing.
- The centreline, section plane and axis-dependent parts agree; bearings, seals and fasteners are not silently mirrored into impossible positions.
- Labels obey sheet margins and minimum printable height after target-office reduction.
- A human mechanical reviewer confirms load path, assembly sequence, motion/flow path and section-plane truthfulness.

## Simulation result

`assets/generated/rotary-valve-actuator-complex-section-concept-v1.png` is a fictional rotary valve actuator, deliberately different from the supplied apparatus. It applies the same **layout grammar**: portrait full section, central axis, upper valve cartridge, lower motor/gearbox, side electronics pocket, exterior callout gutters, cross-hatching, fluid in/out and a dense but controlled reference-sign set.

The image is a generation-quality test specimen, not engineering documentation. In particular, the apparent gearing, seals, valve geometry, bearing selection, clearances and leader terminations require vector editing and mechanical review before any filing use.
