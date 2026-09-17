# AAV Local MCP proxy

## Requirements

AAV Local with the MCP proxy requires Node.js 24 or newer. `node:sqlite` does not exist on Node 18 or 20. SQLite storage opens on the available Node 22.22.1 runtime, but the real MCP v2 stdio initialization test does not complete there. The complete supported baseline therefore remains Node 24; no native dependency or polyfill was added to preserve an older release.

Certification performed for Phase 4:

```text
NODE_MINIMUM_SUPPORTED: 24.0.0
NODE_18: unsupported (node:sqlite unavailable; MCP SDK v2 also requires Node >=20)
NODE_20: unsupported (node:sqlite unavailable)
NODE_22: storage pass on 22.22.1; full MCP stdio E2E unsupported (initialization does not complete)
NODE_24: pass on 24.14.0
```

## Configure

Install workspace packages, build `@agentactionverifier/mcp`, and keep secrets out of `aav.config.json`:

```json
{
  "project": "my-project",
  "mcp": {
    "upstreams": [{
      "id": "github",
      "name": "GitHub MCP",
      "transport": "stdio",
      "command": "node",
      "args": ["./github-mcp-server.mjs"],
      "credentialRef": "github-token",
      "credentialEnv": "GITHUB_TOKEN"
    }]
  }
}
```

`parseAAVLocalMCPConfig()` validates this shape and rejects unknown keys. `credentialRef` is an identifier only. The value comes from the Local AAV `CredentialProvider` (normally an environment-variable provider today and a secure local vault later). Arbitrary environment values are deliberately not accepted in this config.

## Start and connect

```ts
import { createLocalAAV, EnvironmentCredentialProvider } from '@agentactionverifier/gateway';
import { SQLiteStorage } from '@agentactionverifier/storage-sqlite';
import { createAAVMCPProxy } from '@agentactionverifier/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

const stores = new SQLiteStorage('./aav.db');
const credentials = new EnvironmentCredentialProvider(
  { 'github-token': 'GITHUB_TOKEN' },
  process.env,
);
const aav = createLocalAAV({
  project: { id: 'my-project', name: 'My project' },
  agent: { id: 'local-agent', name: 'Local agent' },
  stores,
  credentials,
  policies: [
    { name: 'read issues', decision: 'ALLOW', toolKey: 'github:list_issues' },
    { name: 'approve writes', decision: 'REQUIRE_APPROVAL', toolKey: 'github:create_issue' },
  ],
  port: 7331,
});
const proxy = createAAVMCPProxy({
  projectId: 'my-project', runtime: aav, stores,
  upstreams: [{
    id: 'github', name: 'GitHub MCP', transport: 'stdio',
    command: 'node', args: ['./github-mcp-server.mjs'],
    credentialRef: 'github-token', credentialEnv: 'GITHUB_TOKEN',
  }],
});

await proxy.start();             // initialize and discover upstream tools
await aav.start();               // local approval/receipt HTTP API
await proxy.connect(new StdioServerTransport()); // MCP client-facing transport
```

Point the MCP client at the command hosting this process. The client sees `github:list_issues` and `github:create_issue`, not unqualified upstream names. A tool being visible does not authorize it.

An ALLOW call returns upstream MCP content plus `_meta.aav.runId` and `_meta.aav.receipt`. DENY returns an MCP tool error with `POLICY_DENIED`. REQUIRE_APPROVAL returns `APPROVAL_REQUIRED`, `runId`, and `approvalRequestId` without contacting the upstream. Approve or reject through `POST /v1/local/approvals/{id}/approve|reject`; the existing atomic Local AAV continuation performs at most one call.

Fetch audit data at `/v1/agent/runs/{runId}/events` and the receipt at `/v1/agent/runs/{runId}/receipt`, then verify offline:

```ts
import { verifyReceipt } from '@agentactionverifier/verifier';
console.log(verifyReceipt(receipt, events)); // { ok: true }
```

No Cloud account, billing service, Prisma, Redis, NestJS, or network connection to AAV Cloud is involved.

## Performance sanity

The local E2E on the development container (Node 24.14) completes two upstream initializations, discovery, ALLOW, DENY, approval race, credential reconnect, receipts, and teardown in about 4.8–4.9 seconds. Warm `tools/list` is an in-memory mapping operation; a warm ALLOW call is dominated by the local policy, SQLite, and stdio round trip. These are sanity observations, not an SLA.
