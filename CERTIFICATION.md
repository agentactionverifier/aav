# OSS alpha certification — Phase 7

OWNER_RELEASE_APPROVAL: CONFIRMED

Copyright owner: MARRERO CONSULTORES SAS DE CV.
Approved license: Apache-2.0. MCP distribution: Option A.
Target release: 0.1.0-alpha.0.
Owner publication authorization confirmed. External legal counsel review not
represented. This authorizes the public repository and remote CI, not npm/image
publication, tags or GitHub Releases.

The seven packages retain frozen runtime/APIs and publication-disabled metadata.
Public history is initialized from the approved current OSS tree, with no private
or local certification history. Internal extraction reports and logs are excluded
by [PUBLIC-REPO-MANIFEST.md](PUBLIC-REPO-MANIFEST.md).

Local Linux verification and earlier Docker/packed clean-room certification
passed. Remote Linux/macOS/Windows results must be observed independently;
local success is not remote certification. Node >=24 and MCP stdio define the
alpha surface. See the workflow for typecheck, tests, build, boundary scans,
pack inspection, clean-room and Linux Docker checks.

Pack content reproducibility is tested; byte reproducibility is not asserted
because equivalent package dependency-key ordering can vary during packing.
MCP LICENSE/README contents are retained. Bundled vendor attribution uncertainty
is disclosed in the [MCP redistribution matrix](docs/legal/MCP-REDISTRIBUTION-MATRIX.md).
The installed dependency inventory is not exhaustive bundled-source coverage.

Package release remains gated on actual remote CI and npm authority checks,
followed by separate explicit owner authorization. No external legal opinion
or release publication is claimed by this document.
