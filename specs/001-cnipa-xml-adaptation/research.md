# Architecture research: PatentDraw and CNIPA XML evidence

**Research date:** 2026-07-31
**Decision:** Use a server-authoritative modular monolith plus an isolated asynchronous document
worker. Keep CNIPA XML conversion/submission outside PatentDraw; add only a policy and evidence
adapter.

## 1. Application topology

| Option | Assessment | Decision |
| --- | --- | --- |
| Modular monolith + isolated worker | One transactional authority for revisions, rule runs, approvals and manifests; independently isolates/expands untrusted file processing. | **Adopt for MVP** |
| Business microservices | Creates distributed authorization, audit reconstruction and cross-service consistency before domain boundaries/traffic are proven. | Defer |
| Pure local-first/CRDT | Useful for offline drafting but cannot authoritatively enforce tenancy, approvals, immutable audit or filing evidence. | Use only a disposable local draft cache |

AWS cautions that premature decomposition adds deployment and operational complexity. The browser
OPFS is origin-private and subject to browser-managed storage, so it is not an authority for
recordkeeping or approvals. [AWS decomposition guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/modernization-decomposing-monoliths/)
[MDN OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)

```text
Browser editor (temporary draft / preview)
        │ HTTPS
        ▼
Modular-monolith API ── PostgreSQL (state, access, audit, jobs)
        │                         │
        ├──────── private object storage (originals and hashed derivatives)
        │
        └── durable job ──► isolated document worker (no network)
                                  │
                                  └── canonical SVG, findings, PDF/PNG/TIFF
```

## 2. SVG security and deterministic rendering

**Decision:** Treat incoming SVG as hostile. The document worker must parse it under strict
resource limits, reject active/external content, regenerate a constrained canonical SVG AST, then
render only that derivative. The browser never inserts an original SVG into its DOM.

The canonical grammar includes only the explicitly approved static drawing elements and
fragment-only internal references. It excludes script/event attributes, `foreignObject`, CSS,
animation, filters, raster embeds, `image`, hyperlinks and all network/file/data references.
Each job runs with no network, read-only filesystem, a fixed font subset and CPU/RAM/wall-time/
output-size caps.

**Renderer choice:** `usvg`/`resvg` as the static SVG parser/rasterisation base; `svg2pdf` for a
vector PDF derivative; a TIFF encoder operating only on the already rendered safe raster. Pin
worker image digest, renderer/font/rule configuration IDs and output hashes for reproducibility.
`resvg` is an SVG rendering library and exposes the `usvg` parser; its restricted static scope is
appropriate only when it defines the product grammar, not when arbitrary browser SVG is accepted.
[resvg documentation](https://docs.rs/resvg/latest/resvg/) [usvg options](https://docs.rs/usvg/latest/usvg/struct.Options.html) [svg2pdf](https://docs.rs/svg2pdf/latest/svg2pdf/)

OWASP recommends allowlisted file types, independent type validation, size limits, non-public
storage and sandbox/CDR measures for uploads. [OWASP file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

## 3. Data and security boundary

**Decision:** PostgreSQL is the system of record for business state and append-only audit events;
private object storage keeps originals, canonical SVGs and exports by content hash. All tenant
tables contain an organisation identifier. Application authorization is primary; PostgreSQL row
level security is defence in depth with a non-owner, non-`BYPASSRLS` production role.

PostgreSQL row security defaults to deny when enabled with no policy, while owners and privileged
roles can bypass it; this must be covered by integration tests. [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## 4. CNIPA boundary

**Decision:** Implement `CNIPA eFiling Evidence Adapter`, not a CNIPA submission connector.
It accepts filing intent, artifact/revision hashes and externally produced XML evidence; it emits
only policy findings, missing-evidence lists and a factual audit record.

From 2026-01-01, CNIPA requires XML for electronic patent files and does not accept non-XML
files. The official list explicitly includes `100003` description drawings. XML must comply with
CNIPA data standards; CNIPA provides tools/manuals and requires file checking. CNIPA's user
agreement says electronic files must be submitted using CNIPA-provided or authorised software,
and CNIPA's system record controls the filing date/record. Therefore no credential storage,
browser automation, submission API, acceptance prediction or SVG-to-CNIPA-XML claim belongs in
the MVP. [CNIPA XML notice](https://www.cnipa.gov.cn/art/2025/11/12/art_75_202551.html)
[mandatory file list](https://www.cnipa.gov.cn/module/download/downfile.jsp?classid=0&filename=9ee3f4035a3c4c73983da5438d70cb6b.pdf&showname=%E5%BA%94%E5%BD%93%E4%BB%A5XML%E6%A0%BC%E5%BC%8F%E4%B8%8A%E4%BC%A0%E6%8F%90%E4%BA%A4%E7%9A%84%E4%B8%93%E5%88%A9%E7%94%B5%E5%AD%90%E6%96%87%E4%BB%B6%E6%B8%85%E5%8D%95.pdf)
[CNIPA user agreement](https://resources.cponline.cnipa.gov.cn/protocol/private/index.html)

## 5. Deployment and evolution triggers

Deploy Web/API and worker separately in one region/private network, alongside managed
PostgreSQL and private object storage. Use a durable database-backed job queue initially; promote
to a dedicated broker only after measured worker throughput or isolation needs justify it.

Split a business module only when it has independent ownership/release cadence and a measured
scaling or availability need. Add CRDT/realtime synchronization only after evidence that
simultaneous editing of the same figure is a frequent requirement. Add a local controlled XML
exporter only after CNIPA has provided the applicable current data standard and the project has
written authorization, fixture coverage and sandbox validation; it remains separate from any
submission capability.
