import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { execute, connect, certify } from './protected-flow.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),cli=join(root,'packages/cli/dist/bin.js'),home=mkdtempSync(join(tmpdir(),'aav-examples-')),canary='AAV_EXAMPLE_CANARY_71d3',env={...process.env,AAV_HOME:home,AAV_DEMO_CANARY:canary};
const manage=args=>execute(process.execPath,[cli,...args],{cwd:root,env});
env.AAV_AUTH_TOKEN=JSON.parse((await manage(['init','--name','Runnable examples','--json'])).stdout).bootstrapToken;
await manage(['mcp','add','demo','--command',process.execPath,'--arg',join(root,'examples/mcp-stdio/demo-server.mjs'),'--credential-env','AAV_DEMO_CANARY']);await manage(['policy','add','--tool','demo:echo','--decision','ALLOW']);await manage(['policy','add','--tool','demo:dangerous_action','--decision','REQUIRE_APPROVAL']);
const result=await certify({open:async()=>{const c=await connect(process.execPath,[cli,'start'],env);const me=await fetch('http://127.0.0.1:7331/v1/agent/me',{headers:{authorization:`Bearer ${env.AAV_AUTH_TOKEN}`}});assert.equal(me.status,200);return c;},close:c=>c.close(),manage,canary,saveReceipt:async shown=>{const path=join(home,'receipts/example.json');writeFileSync(path,shown);return manage(['receipt','verify',path,'--json']);}});
const demo=JSON.parse((await execute(process.execPath,['examples/mcp-stdio/demo-client.mjs'],{cwd:root,env})).stdout);assert.match(JSON.stringify(demo.echo),/protected hello/);assert.equal(JSON.parse(demo.dangerous.content[0].text).error.code,'APPROVAL_REQUIRED');
mkdirSync(join(root,'certification'),{recursive:true});writeFileSync(join(root,'certification/examples.json'),JSON.stringify({...result,basicHttp:true,externalDemoServer:true,advertisedDemoClient:true,approvalExample:true,receiptExample:true},null,2)+'\n');console.log('HTTP, MCP stdio server/client, approval and offline receipt examples PASS');
