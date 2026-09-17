# Contributing

Requires Node.js 24+ and pnpm 10.29.3.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
pnpm pack:inspect
pnpm clean-room
```

Keep hosted-service and commercial implementations out of this repository. Do not commit credentials, databases, environment configuration or private receipts. Security changes need tests for default DENY, atomic approval consumption, credential isolation and offline receipts.

The intended contribution license is Apache-2.0. Initial release legal approval remains pending. Submit only work you have the right to contribute.
