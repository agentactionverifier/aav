# MCP approval

Configure `demo:dangerous_action` with `REQUIRE_APPROVAL`. A call returns `APPROVAL_REQUIRED` without running the demo action. In another terminal, inspect and decide it:

```sh
aav approval list
aav approval approve APPROVAL_ID
```

Ten concurrent approval requests still consume the context-bound approval once.
