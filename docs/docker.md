# Docker

Build only from this repository:

```sh
docker build -f Dockerfile.local -t aav-local:candidate .
docker volume create aav-local-data
docker run --rm -v aav-local-data:/data aav-local:candidate init --name demo
```

Set `AAV_AUTH_TOKEN` to the one-time bootstrap token. Configure demo and policy with the same volume:

```sh
docker run --rm -v aav-local-data:/data aav-local:candidate mcp add demo --command node --arg /app/node_modules/@agentactionverifier/cli/dist/bin.js --arg demo-server
docker run --rm -v aav-local-data:/data aav-local:candidate policy add --tool demo:echo --decision ALLOW
docker run --rm -i -e AAV_AUTH_TOKEN -v aav-local-data:/data aav-local:candidate start
```

Use this last command as the MCP client's stdio command. HTTP is loopback-only inside the container; no host port publication is advertised. Management CLI may be executed in the running container. The image runs as UID 1000 and persists SQLite in `/data`. `pnpm docker:test` certifies a real protected flow, approval race, receipts, non-root and restart persistence.
