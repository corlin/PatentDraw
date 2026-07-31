# Research: bounded AI assistance decisions

## Decision: plan before image

Generate a structured FigurePlan from explicitly selected sources before any image request. This
makes source coverage and open questions reviewable. Structured output is a contract, not proof of
technical truth; unknown/unsupported material must produce abstention. OpenAI recommends structured
outputs or application validation for reliable schema-constrained responses. [OpenAI guidance](https://help.openai.com/en/articles/8555517)

**Alternatives rejected:** direct prompt-to-image first creates untraceable geometry and obscures
unsupported components; autonomous SVG generation violates the constitution.

## Decision: one server-side provider adapter and test double

The API owns a small provider interface with two operations: propose a FigurePlan and create a
draft asset. The first delivery uses a deterministic test double for all automated tests and pilot
gating. A real provider is selected/configured server-side only after consent, source selection and
policy checks.

**Alternatives rejected:** direct browser calls expose credentials and evade audit; multiple
providers/model routing add cost and evaluation complexity before value is proven.

## Decision: image is an asset, never a final figure

An image model may create/edit an image candidate, but that output is a `GeneratedDraftAsset` with
limitations. The drafter must create a separate canonical SVG through the normal workflow. Current
OpenAI image models support image generation and editing, but that capability does not establish
patent-drawing correctness. [OpenAI image model documentation](https://developers.openai.com/api/docs/models/gpt-image-2)

## Decision: provenance, consent and evaluation are release gates

Record input/source hashes, model/version, instruction version, output hashes, consent, actor/time
and limitation state. Measure source grounding, abstention correctness, invalidation and reviewer
rejection before exposing AI to customer materials. NIST's generative-AI profile calls out data
provenance, underlying model/version, human oversight and evaluation records. [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
