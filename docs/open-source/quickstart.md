# AAV Local five-minute quickstart

Requirements: Node.js 24+, pnpm 10.29.3, and no Cloud account.

```sh
pnpm install
pnpm --filter @agentactionverifier/cli... build
export AAV_CLI="$PWD/packages/cli/dist/bin.js"
node "$AAV_CLI" init --name demo
```

Copy the one-time bootstrap token and set it in the current shell. It is not stored by AAV:

```sh
export AAV_AUTH_TOKEN='the-token-shown-by-init'
node "$AAV_CLI" mcp add demo \
  --transport stdio \
  --command node \
  --arg "$AAV_CLI" \
  --arg demo-server
node "$AAV_CLI" policy add --tool demo:echo --decision ALLOW
node "$AAV_CLI" policy add --tool demo:dangerous_action --decision REQUIRE_APPROVAL
node "$AAV_CLI" doctor
```

An MCP client must launch `node "$AAV_CLI" start` as its stdio MCP server. The included client does that and demonstrates discovery plus protected calls:

```sh
node examples/mcp-stdio/demo-client.mjs
```

The client sees `demo:echo`, `demo:read_demo`, and `demo:dangerous_action`. `echo` runs, `read_demo` is denied by default, and `dangerous_action` returns `APPROVAL_REQUIRED` without reaching the harmless simulated action.

Inspect and approve from another terminal while the client connection remains open:

```sh
node "$AAV_CLI" approval list
node "$AAV_CLI" approval approve APPROVAL_ID
node "$AAV_CLI" runs list
node "$AAV_CLI" runs show RUN_ID --json > .aav/receipts/run.json
node "$AAV_CLI" receipt verify .aav/receipts/run.json
```

Everything runs locally with SQLite. No hosted database, cache, billing, email, login or AAV Cloud connection is used.
