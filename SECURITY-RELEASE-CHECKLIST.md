# Security release checklist — Phase 6.2

Technical evidence is not legal approval. Publication remains disabled by private flags.

OWNER_RELEASE_APPROVAL: CONFIRMED. Copyright owner: MARRERO CONSULTORES SAS DE CV.
Approved license: Apache-2.0; MCP distribution: Option A; target: 0.1.0-alpha.0.
Owner publication authorization confirmed. External legal counsel review not
represented. Repository publication/remote CI only; package/image publication
and release creation remain gated. Legal-review items below do not imply an
external legal opinion or revoke this explicit owner authorization.

- [x] Owner-approved security contact: security@agentactionverifier.com (SECURITY.md and README.md)
- [x] Copyright owner confirmed by explicit release instruction: MARRERO CONSULTORES SAS DE CV; distinct from third-party copyrights
- [x] Seven coordinated versions: 0.1.0-alpha.0; public access / alpha tag metadata
- [x] Frozen portable runtime; SDK/Cloud versions unchanged
- [x] Support wording: Linux x64 / Node >=24 / MCP stdio; others not yet certified
- [x] LICENSE, preserved notices, production/dev inventory, human legal-review document and SBOM
- [x] Docker Node 24 base pinned by immutable multiarchitecture index digest
- [x] Linux/macOS/Windows CI prepared without publish/deploy/production secrets
- [x] MCP redistribution technical review: PASS; matrix and per-file evidence recorded
- [x] PROPOSED_DISTRIBUTION_OPTION: A; retain complete upstream MCP contents and attribution evidence without runtime changes
- [ ] MCP legal signoff: PENDING; includes transition, CC-BY applicability and bundled attribution coverage
- [ ] Human legal/copyright/NOTICE approval, including file-header policy and bundled third-party notices
- [ ] MCP license-transition and CC-BY applicability signoff; owner confirmation does not resolve these decisions
- [ ] Proven npm publishing authority for scope and all seven names (UNKNOWN is not permission)
- [ ] Owner creates intended public repository after separate approval
- [ ] Remote public CI execution, including macOS and Windows
- [ ] Final human release approval, disclosure policy and deliberate review/removal of seven publication-disabled flags

Pack content reproducibility is mandatory. Byte reproducibility is not claimed if pnpm reorders equivalent manifest dependency keys; that documented alpha limitation is not an additional blocker. Technical evidence must be refreshed after approved release artifacts change.
