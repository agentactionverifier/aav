# MCP redistribution review

Technical evidence collected 2026-09-17. No legal approval or runtime change.
AAV copyright owner: MARRERO CONSULTORES SAS DE CV. This does not replace any
third-party copyright or establish ownership of MCP or its bundled libraries.

## Scope and reproducible evidence

Inspected the official npm tarballs for `@modelcontextprotocol/client`,
`@modelcontextprotocol/core`, and `@modelcontextprotocol/server`, all **2.0.0**;
verified registry SHA-512 integrity; compared every extracted file by SHA-256
against the existing final image `aav-local:license-cleanup`, image ID
`sha256:1c24d0d3a08b391a8863e580d56ab5446db12073c1174aa874d82089af36fb06`.
The image installs production dependencies using `npm install --omit=dev`.
No image rebuild, dependency replacement, or artifact pruning was performed.
This result identifies that local image, not an uninspected published image.

The companion [file inventory](MCP-REDISTRIBUTION-EVIDENCE.json) records every
MCP artifact path, byte length, hash, Docker comparison, source-map source path,
package export, and the seven inspected AAV pack file lists. All 191 MCP files
are present and byte-identical in `/app/node_modules/@modelcontextprotocol/`;
there are no missing, extra, or changed files in those three package directories.

| Package suffix | Tarball SHA-256 | Files | JS | Declarations | Maps | Other |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| client | cb470b0249b4a06e262145ab2281ea25344e77608f312a5a52ab4dcc26bfa732 | 85 | 24 | 22 | 36 | 3 |
| core | e9433b8d271acad34381bebb50fa68f464edfdef2ee26a35dfd564b5c9ac05e6 | 21 | 6 | 6 | 6 | 3 |
| server | b4f0dfda3b73b322f1091b86fabe568994eb2fedef873b12db2c54adc3cfe198 | 85 | 26 | 22 | 34 | 3 |

Declarations are `.d.cts`/`.d.mts`, not executable implementation. Other files
are `package.json`, `LICENSE`, and `README.md`. There are no standalone original
implementation `.ts` files, separate examples directories, or full specification
documents. However, source maps embed original implementation source,
documentation comments, examples and schema/protocol descriptions. Therefore
absence of standalone files does NOT establish absence of redistributed source
or documentation/specification-derived material.

## License evidence and limits

All three package manifests declare `MIT`. Their LICENSE files are identical,
SHA-256 `0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a`.
Each contains the MIT-to-Apache transition statement (lines 1–5), Apache-2.0
text (from line 9), MIT text (from line 188), and documentation CC-BY-4.0
statement/link (lines 212–216). The MIT portion names
`Copyright (c) 2024-2025 Model Context Protocol a Series of LF Projects, LLC.`

The upstream [pinned LICENSE](https://github.com/modelcontextprotocol/typescript-sdk/blob/60321700871029401a2e3bed8fdf4f02c9ec3331/LICENSE)
has the same bytes. This is license-text evidence, not proof that those npm
packages were built from that commit. No per-file/contribution relicensing map
was established. Metadata alone cannot classify all MCP implementation as MIT;
the transition statement alone cannot classify all implementation as Apache.
MIT-labelled bundled `content-type` code is positively present. Exact
Apache-versus-MIT assignment of MCP contributions remains unestablished.

Literal CC-BY references were found in LICENSE, not in the other inspected
artifacts. README files and embedded documentation exist, and upstream's
documentation statement makes their classification a human question; lack of
a CC marker in a README or comment does not settle that question. Full
specification text was not found as a separate document. Schema descriptions
and specification-linked comments need separate classification; do not apply
the documentation rule indiscriminately to specifications or executable code.

## Redistribution matrix

`YES` means observed, not legally approved. `Conditional` identifies upstream
terms for human assessment, not an AAV legal conclusion. All package names below
have the `@modelcontextprotocol/` prefix and version 2.0.0. Source-map content is
embedded within the map artifact, not additional independent files.

| package | artifact | artifact_type | present_in_npm_package | present_in_AAV_Docker | license_basis | attribution_required | human_review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| client | dist/**/*.cjs, dist/**/*.mjs (24) | A runtime code | YES | YES, identical | MIT manifest; transitional LICENSE; bundled code below | Conditional MIT/Apache/vendor terms | Per-contribution and bundle assessment |
| core | dist/**/*.cjs, dist/**/*.mjs (6) | A runtime code | YES | YES, identical | MIT manifest; transitional LICENSE | Conditional MIT/Apache terms | Per-contribution assessment |
| server | dist/**/*.cjs, dist/**/*.mjs (26) | A runtime code | YES | YES, identical | MIT manifest; transitional LICENSE; bundled code below | Conditional MIT/Apache/vendor terms | Per-contribution and bundle assessment |
| client | LICENSE | B license text | YES | YES, identical | Apache + MIT + CC transition text | Preserve complete upstream text | YES; not all contents necessarily license all artifacts |
| core | LICENSE | B license text | YES | YES, identical | Apache + MIT + CC transition text | Preserve complete upstream text | YES |
| server | LICENSE | B license text | YES | YES, identical | Apache + MIT + CC transition text | Preserve complete upstream text | YES |
| client | README.md (1,365 bytes) | C documentation; D inline examples | YES | YES, identical | Upstream docs CC-BY statement; individual content mapping unresolved | Conditional CC attribution/license/link and modification information | YES |
| core | README.md (1,940 bytes) | C documentation; D inline examples | YES | YES, identical | Upstream docs CC-BY statement; individual content mapping unresolved | Conditional CC attribution/license/link and modification information | YES |
| server | README.md (1,939 bytes) | C documentation; D inline examples | YES | YES, identical | Upstream docs CC-BY statement; individual content mapping unresolved | Conditional CC attribution/license/link and modification information | YES |
| client | dist/**/*.map (36; 22 with nonempty sourcesContent) | A embedded source; C comments; D examples; E schema references | YES | YES, identical | Mixed upstream and bundled-source evidence | Conditional artifact-specific terms | YES; do not equate all map content with CC docs |
| core | dist/**/*.map (6; 2 with nonempty sourcesContent) | A embedded source; C comments; D examples; E schema references | YES | YES, identical | MCP transition statement; individual content mapping unresolved | Conditional artifact-specific terms | YES |
| server | dist/**/*.map (34; 22 with nonempty sourcesContent) | A embedded source; C comments; D examples; E schema references | YES | YES, identical | Mixed upstream and bundled-source evidence | Conditional artifact-specific terms | YES |
| client | dist/**/*.d.cts, dist/**/*.d.mts (22) | Type interface; C embedded comments | YES | YES, identical | Generated interfaces; upstream transition evidence | Conditional artifact-specific terms | YES; exports expose types |
| core | dist/**/*.d.cts, dist/**/*.d.mts (6) | Type interface; C embedded comments | YES | YES, identical | Generated interfaces; upstream transition evidence | Conditional artifact-specific terms | YES |
| server | dist/**/*.d.cts, dist/**/*.d.mts (22) | Type interface; C embedded comments | YES | YES, identical | Generated interfaces; upstream transition evidence | Conditional artifact-specific terms | YES |
| client/core/server | package.json (each) | Package resolution and license metadata | YES | YES, identical | Declared MIT; upstream LICENSE qualifies interpretation | Preserve resolution metadata and declared license | YES; not a blanket legal determination |
| client/core/server | Standalone examples, documentation trees, full specification documents, NOTICE/COPYING | B/C/D/E independent files | NOT FOUND | NOT FOUND | No independent artifact found | No such file to propagate from these tarballs | Review embedded material separately |

## AAV packs versus Docker

Inspected actual `@agentactionverifier/{protocol,core,verifier,gateway,storage-sqlite,mcp,cli}`
0.1.0-alpha.0 tarballs. None contains MCP implementation, MCP LICENSE/README,
MCP source maps, embedded MCP examples or specifications, or `node_modules`.
Dependency declarations/imports are present; installation supplies MCP separately.
AAV does **not** modify MCP code and does **not** copy MCP implementation into
AAV source. Docker nevertheless redistributes upstream code and embedded source
inside installed npm dependencies. These are different distribution boundaries.

## Bundled-source attribution issue discovered in this review

Client/server map source paths identify eight additional upstream package/version
families below, with nonempty embedded source. These are not equivalent to eight
additional separately installed dependencies. Some content is declarations or
schema metadata rather than executable code. Version paths and matching vendor
tarballs are supporting evidence, not a license assignment for every bundled byte.

| Bundled package/version | Exact npm metadata | Declared license | Vendor evidence |
| --- | --- | --- | --- |
| ajv 8.18.0 | [registry](https://registry.npmjs.org/ajv/8.18.0) | MIT | package/LICENSE |
| fast-deep-equal 3.1.3 | [registry](https://registry.npmjs.org/fast-deep-equal/3.1.3) | MIT | package/LICENSE |
| json-schema-traverse 1.0.0 | [registry](https://registry.npmjs.org/json-schema-traverse/1.0.0) | MIT | package/LICENSE |
| fast-uri 3.1.0 | [registry](https://registry.npmjs.org/fast-uri/3.1.0) | BSD-3-Clause | package/LICENSE |
| ajv-formats 3.0.1 | [registry](https://registry.npmjs.org/ajv-formats/3.0.1) | MIT | package/LICENSE |
| @cfworker/json-schema 4.1.1 | [registry](https://registry.npmjs.org/@cfworker%2fjson-schema/4.1.1) | MIT | No license file in its tarball; pinned repository LICENSE.md below |
| content-type 1.0.5 | [registry](https://registry.npmjs.org/content-type/1.0.5) | MIT | package/LICENSE; preserved MIT copyright header in MCP JS |
| json-schema-typed 8.0.2 | [registry](https://registry.npmjs.org/json-schema-typed/8.0.2) | BSD-2-Clause | package/LICENSE.md; includes type source in maps |

The pinned [cfworker LICENSE.md](https://github.com/cfworker/cfworker/blob/5409fdc2bd144f68e8b28c61c71fcb16600000a6/LICENSE.md)
contains MIT text and `Copyright (c) 2020 Jeremy Danyow`; repository-wide
applicability to each bundled artifact still requires review. Vendor tarball
integrity was verified. None supplied a separate NOTICE file. The candidate's
existing copied-license inventory does not contain dedicated evidence files for
these eight families. Therefore the earlier **15 installed packages / 13 MIT /
2 ISC** result must not be read as exhaustive attribution coverage for all
bundled content in Docker. This review has not repaired or certified that gap.

## Technical options (no legal preference)

**Option A — current artifact layout:** Retain all upstream artifacts byte for
byte. Maintain complete LICENSE texts and accompany potentially CC-governed
documentation with the attribution packet approved by the reviewer. Preserve
applicable bundled-library copyright/license evidence as determined in review.
Benefit: original artifacts, types and source-map diagnostics remain intact;
no pruning-maintenance risk. Cost: documentation and embedded-source licensing
remain within the redistribution review; existing attribution coverage is not
certified complete.

**Option B — narrowly scoped documentation pruning:** The three README.md files
are technical exclusion candidates only. No runtime JS reference to those files
was found, and package exports do not require them. Their total uncompressed size
is 5,244 bytes. Keep JS, package.json, complete LICENSE and any required NOTICE,
and preserve exported resources, types and maps unless separately justified.
Benefit: removes standalone README documentation from the image with negligible
size savings. Cost: an explicit packaging rule and isolated regression check
would be needed; embedded comments/examples in maps and interfaces still remain.
Removing README does not resolve code-license mapping or bundled attribution.
No removal was implemented and no pruned image was tested; safety is a static
technical finding, not a completed removal certification. Wholesale deletion
of maps, types, schemas or chunks is not justified by this review.

## Attribution packet for human decision

Preserve the three complete MCP LICENSE files (already retained under
`third-party-licenses/_modelcontextprotocol_{client,core,server}-2.0.0-LICENSE`)
and their upstream copyrights. No standalone MCP NOTICE was found. Keep AAV's
own Apache-2.0 LICENSE/NOTICE separate from third-party ownership and terms.
For Option A, retain README/documentation and provide the approved creator,
copyright, source/material URL, license link, disclaimer and modification
information where applicable. Files are byte-identical, but that fact alone is
not legal approval. The [CC-BY-4.0 legal text](https://creativecommons.org/licenses/by/4.0/legalcode.en)
and [MIT text](https://opensource.org/license/mit) supply conditional review
criteria; no conclusion is made about applicability to an individual artifact.
Also assess retention/provision of the eight bundled vendors' actual license
and copyright texts, including the BSD terms, rather than relying only on npm's
installed-dependency graph or the absence of files named NOTICE.

Precise human question: Which distributed MCP contributions, README text,
embedded comments/examples and schema/specification material fall under MIT,
Apache-2.0 or CC-BY-4.0; what attribution and license materials cover those and
the bundled vendor sources; and is the chosen artifact layout and accompanying
attribution packet sufficient before release? Attribution coverage remains
uncertified pending that determination and any authorized documentation fix.

Technical inventory is ready for a final human/legal decision, **not** a release
authorization. No runtime files changed; no commit, remote, publish or push.

HUMAN_LEGAL_DECISION_REQUIRED
