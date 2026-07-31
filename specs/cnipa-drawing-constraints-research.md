# CNIPA drawing constraints: research record and rule-pack input

**Retrieval date:** 2026-07-31
**Scope:** CNIPA invention and utility-model description drawings plus the directly related
electronic-filing XML policy. This record does not cover design, plant or trademark image
requirements, XML generation, electronic submission, or office acceptance.

## Authoritative sources used

1. CNIPA *Patent Examination Guidelines (2023)*, Order No. 78, effective 2024-01-20;
   Part I, Chapter 2, §7.3 sets out the preliminary-examination treatment of utility-model
   description drawings. [Order No. 78](https://www.cnipa.gov.cn/art/2023/12/21/art_99_189202.html)
   [Guidelines PDF](https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=5753f257e6a04b6f8e305eb6d34ba452.pdf&showname=%E4%B8%93%E5%88%A9%E5%AE%A1%E6%9F%A5%E6%8C%87%E5%8D%97.pdf)
2. CNIPA Order No. 84, published 2025-11-13 and effective 2026-01-01. CNIPA's 2026
   guidance is read as the 2023 Guidelines plus this amendment decision; the decision does
   not amend Part I, Chapter 2, §7.3. [Order No. 84](https://www.cnipa.gov.cn/art/2025/11/13/art_99_202568.html)
   [CNIPA 2026 response](https://www.cnipa.gov.cn/jact/front/mailpubdetail.do?sysid=6&transactId=533792)
3. *Implementing Regulations of the Patent Law (2023)*: an invention/utility-model
   specification includes brief drawing descriptions; a utility model must include drawings
   of the claimed product's shape, structure or combination; figures and reference signs
   have consistency requirements. [CNIPA Regulations](https://www.cnipa.gov.cn/art/2023/12/21/art_98_189197.html?siteId=qingdao)
4. CNIPA notice on comprehensive XML implementation, published 2025-11-12: from 2026-01-01,
   CNIPA no longer accepts non-XML electronic patent files. Its attached file list expressly
   includes description drawings. [CNIPA comprehensive XML notice](https://www.cnipa.gov.cn/art/2025/11/12/art_75_202551.html)
   [CNIPA XML file list](https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=9ee3f4035a3c4c73983da5438d70cb6b.pdf&showname=%E5%BA%94%E5%BD%93%E4%BB%A5XML%E6%A0%BC%E5%BC%8F%E4%B8%8A%E4%BC%A0%E6%8F%90%E4%BA%A4%E7%9A%84%E4%B8%93%E5%88%A9%E7%94%B5%E5%AD%90%E6%96%87%E4%BB%B6%E6%B8%85%E5%8D%95.pdf)
5. CNIPA customer-service response dated 2025-01-27 restates the drawing-examination
   checklist in one accessible summary. It corroborates, but does not replace, the Guidelines.
   [CNIPA response](https://www.cnipa.gov.cn/jact/front/mailpubdetail.do?sysid=6&transactId=485638)

## Constraints introduced into PatentDraw

| Constraint family | CNIPA rule effect | Product implication |
| --- | --- | --- |
| Drawability and visual treatment | No engineering blueprint or photograph; tool-drawn, uniformly clear, unaltered lines; no irrelevant border; normally black, with colour only when needed for technical explanation. | Reject unsafe photo/blueprint workflow for a CNIPA figure revision; surface colour as a named manual exception. |
| Figure geometry and layout | `图1`/`图2`… with Arabic sequence below each figure; figures normally upright and separated; landscape rotation has a whole-sheet consistency rule. | A CNIPA layout mode controls figure-label grammar, label position, orientation and multi-figure page composition. |
| Reproduction quality | Details remain clear after reduction to two-thirds and support copying/scanning. | Render the 2/3 preview from the exact export candidate, then require reviewer sign-off on any low-confidence detail. |
| Mark and language discipline | Same component/reference sign is consistent across figures and text; no orphan signs; only indispensable text; Chinese words with optional original-language term after it in parentheses. | The numeral registry becomes a cross-document contract; add Chinese-text and text-necessity findings. |
| Diagrams and disclosure | Blocks in structural/logic/process diagrams contain needed words/symbols; one figure has a consistent scale except a separate enlarged detail; the drawings depict claimed product shape/structure/combination, not only prior art or performance curves. | Provide a CNIPA diagram template and turn content/claim coverage into an explicit human-review task. |
| Sheet administration | Drawing sheets have consecutive Arabic page numbers. | Add drawing-sheet sequencing to the export validator and manifest. |

## Important distinctions from the existing PCT/USPTO baseline

- CNIPA requires the `图N` convention and the label directly below its figure.
- Necessary drawing words are Chinese, not merely translation-safe.
- CNIPA expressly prohibits photographs and engineering blueprints for this drawing class.
- A landscape figure determines the orientation of all figures on the same sheet.
- CNIPA ties the utility-model drawing set directly to the claimed product's shape, structure
  or combination. A performance-only graph is not a substitute.

## 2026 change assessment

Order No. 84 is effective from 2026-01-01, but it does **not** amend the description-drawing
requirements in Part I, Chapter 2, §7.3. `CNIPA-FIG-001` through `CNIPA-FIG-009` therefore
remain unchanged. The substantive change relevant to PatentDraw is operational: from
2026-01-01, CNIPA's comprehensive XML notice requires XML for electronic patent files and no
longer accepts non-XML files; the mandatory list expressly includes description drawings.

PatentDraw must distinguish a drawing-formality result from an electronic-filing readiness
record. For CNIPA routes, that record needs the application date, declared route,
policy-effective date, XML-package status, package hash where provided, converter/tool
version, preview/proofread attestation and named reviewer. The record can say `manual-review-required` or
`not-CNIPA-electronic-submission-ready`; it must never imply that CNIPA accepted the package.

## Known limitations and release boundary

Raw SVG is not a CNIPA XML electronic application package. PatentDraw therefore retains SVG as
the sanitized editable master and exports a separate PDF/PNG/TIFF candidate. XML generation,
conversion conformance and electronic submission remain excluded until the project records the
applicable CNIPA data standard and a real channel validation. The CNIPA profile must remain
`internal-formality-review`, not `CNIPA filing accepted`.

The profile does not decide whether an annotation is indispensable, whether a product drawing
fully supports the claims, whether a colour exception is justified, or whether the technical
content is correct. Those findings remain `manual-review-required` with an identified reviewer.
