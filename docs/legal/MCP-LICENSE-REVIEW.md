# MCP license evidence — human review packet

Evidence collected 2026-09-17. This is a factual inventory, not a legal conclusion. AAV remains Apache-2.0 candidate; dependency declarations do not resolve contribution ownership or applicable terms.

## Exact npm artifacts

| Package | Version | Declared package.json license | Preserved distributed LICENSE |
| --- | --- | --- | --- |
| @modelcontextprotocol/client | 2.0.0 | MIT | [client](../../third-party-licenses/_modelcontextprotocol_client-2.0.0-LICENSE) |
| @modelcontextprotocol/core | 2.0.0 | MIT | [core](../../third-party-licenses/_modelcontextprotocol_core-2.0.0-LICENSE) |
| @modelcontextprotocol/server | 2.0.0 | MIT | [server](../../third-party-licenses/_modelcontextprotocol_server-2.0.0-LICENSE) |

Each installed npm package contains LICENSE, README.md, package.json and dist/. All three LICENSE texts have SHA-256 `0382b0057770ca05e9c350a50aa3b1c1fea84da0bc81d723bf00b9aa841be58a`. The frozen lockfile fixes these versions; [redistribution evidence](MCP-REDISTRIBUTION-EVIDENCE.json) establishes preservation of their complete license bytes in the inspected image. No versions/APIs/runtime implementation changed.

## Immutable upstream evidence

All three manifests identify https://github.com/modelcontextprotocol/typescript-sdk. The observed main commit on 2026-09-17 was [60321700871029401a2e3bed8fdf4f02c9ec3331](https://github.com/modelcontextprotocol/typescript-sdk/commit/60321700871029401a2e3bed8fdf4f02c9ec3331), timestamp 2026-09-16T16:51:56Z. Its [pinned LICENSE](https://github.com/modelcontextprotocol/typescript-sdk/blob/60321700871029401a2e3bed8fdf4f02c9ec3331/LICENSE) has exactly the same SHA-256. Text equality does not establish this commit as the npm build source: installed manifests do not expose gitHead proving that connection.

## Transition and exact locations

The same line positions apply to the three preserved npm LICENSE files and pinned upstream LICENSE:

- Line 1 describes MIT → Apache-2.0 transition, new code/specification contributions under Apache-2.0, and CC-BY-4.0 for documentation excluding specifications.
- Line 3 distinguishes contributions with relicensing consent from original MIT contributions without that consent. Line 5 limits the rights granted to the applicable original terms.
- Apache text begins at line 9; MIT heading is line 188, with copyright attribution at line 190.
- CC-BY-4.0 occurs at line 1, in the Creative Commons heading at line 212, and in the documentation/legalcode reference at line 215. Lines 214–216 describe documentation excluding specifications and link to the full CC legalcode.

The declaration MIT and transition text are separate facts. This packet cannot identify consenting authors, assign licenses to individual contributions, or approve an AND/OR expression.

## Actual AAV redistribution

Read-only inspection of the existing certified `aav-local:license-cleanup` image found 85 client files, 21 core files and 85 server files. All three include README.md and the matching LICENSE; README.md is their only Markdown file. No standalone docs/, examples/ directory or separate specification document was found in these inventories.

| Artifact | Distribution evidence | Classification / uncertainty |
| --- | --- | --- |
| Complete LICENSE files | Copied into source review evidence and installed runtime node_modules | Attribution/legal text, including CC-BY references, not executable code |
| README.md files | Actually installed in the runtime image | Upstream documentation with inline code examples; applicable terms require reviewer determination |
| dist/ JS, declarations/maps | Production dependency installation | Runtime implementation and generated types/maps; extensions do not determine licenses of comments or embedded source |
| core protocol/OAuth schema constants | Installed package; core README describes these schemas | Runtime schema implementation, not proof of a complete specification publication |
| Linked upstream documentation/specification | Links in README | Links alone are not copies; inventory is not a global proof about embedded text |
| Seven AAV npm archives | AAV compiled files/README/LICENSE; MCP dependencies are external references | No MCP implementation bundle in AAV archives; Docker installation separately redistributes dependencies |

CC-BY references **and upstream README documentation are redistributed**. It would be inaccurate to claim no potentially CC-covered material is shipped just because MCP is a dependency. Whether README/examples/comments/embedded text actually invoke CC-BY-4.0 is UNDETERMINED here. No TypeScript development package or its bundled notices are installed in the runtime.

## Precise human decision

Approve whether AAV may distribute these exact three 2.0.0 artifacts, including runtime code, documentation/examples, declarations/maps and full license evidence, under the upstream transition terms. Resolve contribution/license applicability despite MIT metadata; determine whether redistributed documentation/embedded material invokes CC-BY-4.0; approve the required license/attribution/notice preservation separately for source, npm and Docker artifacts. No upstream NOTICE filename is not proof that no obligations exist. No consent or legal approval is inferred.

HUMAN_LEGAL_DECISION_REQUIRED
