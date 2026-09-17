# AAV Local MCP security model

## Boundary

The AAV Local process, AAV core, and operator-controlled local storage are trusted. The agent, model output, MCP client input, upstream tool metadata, upstream responses, and external network are untrusted.

The enforced path is:

```text
MCP client -> AAV Local MCP proxy -> policy/risk/approval -> credential isolation -> upstream MCP server
```

AAV can block or authorize an action only when the agent has no bypass path to the tool, credential, or upstream. If the agent can directly access the upstream MCP server or its credentials, AAV cannot enforce that bypassed action.

Discovery is not authorization. `tools/list` exposes a bounded, sanitized, namespaced catalog; every `tools/call` remains default-deny until an explicit AAV policy allows it or an exact approval is atomically consumed.

## Guarantees and limits

- Tool mappings bind a stable `upstream-id:original-tool-name` to one upstream and one original tool.
- Policy, approval, idempotency, audit-chain v1, receipts, and offline verification use the existing Local AAV gateway and core.
- An approval is bound to the project, principal, run, tool, policy, arguments, and request fingerprint. Rejection or expiry makes no upstream call. Concurrent approval decisions can consume it once.
- Stdio credentials are resolved only after authorization. AAV reconnects the upstream once with the credential in the configured child-process environment variable. The secret is not added to MCP arguments, tool schemas, audit events, receipts, or client-visible output. Upstream output is recursively redacted before audit or response.
- AAV does not automatically retry `tools/call`. Reconnection is controlled and execution with an unknown external outcome is not retried.
- AAV controls its own continuation and idempotency record. It does not universally guarantee exactly-once external effects after a crash unless the upstream cooperates with idempotency or transactions. Representing `OUTCOME_UNKNOWN` would require a separately designed protocol evolution; audit-chain v1 is unchanged here.
- AAV does not prevent prompt injection. It limits the consequences of actions by enforcing policies at the action boundary.

## Untrusted metadata

Names, descriptions, schemas, annotations, and capability declarations are data, never executable instructions. AAV limits tool count, name and description length, schema byte size and depth, accepts a restricted tool-name alphabet, and keeps only boolean MCP safety hints. Invalid metadata fails closed. Descriptions are passed to the MCP client as untrusted display text and are never interpolated into commands, SQL, or security decisions.

Phase 4 advertises only `tools`. Resources, prompts, sampling, and elicitation are not proxied or advertised. The stable upstream transport in this phase is stdio; Streamable HTTP is intentionally deferred until its local authentication and session lifecycle can be exercised to the same standard.
