# Approved public source manifest — Phase 7

Export only the current OSS candidate tracked files, with fresh Git history.
Include the seven packages (protocol, core, verifier, gateway, storage-sqlite,
mcp, cli), examples, public docs, scripts, GitHub Actions, Docker OSS files,
root workspace/build metadata, README, LICENSE, NOTICE, SECURITY, CONTRIBUTING,
release/security checklists, dependency inventory, copied third-party licenses,
SBOM and MCP legal review materials.

Do not export `.git`, dependency/build/database/environment state or internal
certification reports/logs. Specifically exclude `certification/`,
`EXTRACTION.json`, `FILES_INCLUDED.txt`, `FILES_EXCLUDED.txt`. These are local
extraction/certification evidence, not public source. CI generates fresh reports.

No hosted application source, private deployment configuration, secrets, or
private history is permitted. Keep publication-disabled package metadata.
The initial public commit must contain only the approved current source tree.
