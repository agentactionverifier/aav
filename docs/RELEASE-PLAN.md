# First OSS alpha — safe release plan

All seven candidate packages are coordinated at `0.1.0-alpha.0`. The npm dist-tag is `alpha`, not `latest`. Future progression: `0.1.0-alpha.x` → `0.1.0-beta.x` → `0.1.0`, with reviewed packs and explicit human promotion at each stage. Intended repository: https://github.com/agentactionverifier/aav; not created or pushed.

Production dependency order:

1. @agentactionverifier/protocol
2. @agentactionverifier/core
3. @agentactionverifier/verifier
4. @agentactionverifier/gateway
5. @agentactionverifier/storage-sqlite
6. @agentactionverifier/mcp
7. @agentactionverifier/cli

Source dependencies remain `workspace:*`; pnpm pack rewrites them to the exact coordinated alpha version. Inspect packed manifests before publication. Tarball-only installation certifies the dependency graph without assuming registry publication.

Root and seven packages retain `private: true` as an intentional human gate. publishConfig records public access, the public npm registry and alpha; it does not override private. After legal, npm authority, remote CI and final owner approval, a human must explicitly remove the seven package private flags, regenerate/reinspect packs and repeat certification. This phase does not remove them. Normal build/test/CI never publishes.

Certification dry runs use reviewed tarballs and **always** supply `--dry-run --ignore-scripts --tag alpha --access public`. A dry run proves contents, not authentication, organization membership, permissions or legal approval. No actual publication is authorized. See official [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/) and [organization roles](https://docs.npmjs.com/organization-roles-and-permissions/) documentation. Never print/commit tokens. Anonymous 404 does not prove publishing authority; UNKNOWN blocks publication.

Use Node 24, pnpm 10.29.3 and frozen lockfile with unchanged generated outputs for both pack runs. Archive lists and runtime bytes must match. If only package.json dependency-key ordering differs, require deep semantic equality and record raw metadata bytes and SHA differences. Do not claim byte reproducibility. This documented pnpm limitation is accepted for alpha, not a technical alpha blocker.

Docker's readable Node 24 tag is pinned to an OCI image-index digest including Linux amd64 and arm64. Only Linux x64 is certified. Pinning the base does not promise determinism of every npm/toolchain artifact or build timestamp. The application SBOM excludes operating-system packages; separate image license review remains appropriate before image distribution.

SDK remains Cloud-oriented and outside this release, unchanged in version/implementation/publication. macOS/Windows CI is prepared but not yet certified; Streamable HTTP, resources and prompts are not yet certified. No registry pushes, deployments or production secrets in normal PR/push CI.

After eventual publication, install exact reviewed versions afresh and repeat MCP/receipt tests. Unsafe release promotion must stop; any tag withdrawal/deprecation requires separately authorized human action. Unpublish is not guaranteed rollback.
