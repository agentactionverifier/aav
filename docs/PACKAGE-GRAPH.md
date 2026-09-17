# Dependency graph and API review

Production edges (arrows mean depends on):

```text
core -> protocol
verifier -> protocol
storage-sqlite -> core, protocol
gateway -> core, protocol, undici
mcp -> core, gateway, protocol, MCP client/server v2
cli -> core, gateway, mcp, protocol, storage-sqlite, verifier, MCP server v2
```

Tests add SQLite/verifier and MCP client edges. The separate hosted-service SDK is excluded; gateway E2E uses local HTTP directly.

Public exports were reviewed for portable contracts, policy, risk, grants, approval, credentials, idempotency, validation, protocol, verification, network/gateway, storage, MCP and CLI configuration. No hosted-service implementation is exported.

Pre-1.0 API risks: storage interfaces and the public SQLite handle expose implementation details; runtime/MCP option shapes and CLI JSON formats are unstable. Protocol audit-chain v1 is unchanged. The local HTTP `organizationId` and audit `tenantId` compatibility fields refer to the local project, not hosted authentication. Verifier's legacy `require` export points to ESM and is not advertised as a separate CommonJS build.

Windows risks requiring execution: MCP SDK stdio resolution of `.cmd` launchers, signal teardown, PATHEXT resolution by doctor, path separators, and npm/npx execution. CI is prepared; code inspection is not platform certification.
