import { mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { execute, connect, certify } from './protected-flow.mjs';

const root=process.cwd(),cli=join(root,'node_modules','@agentactionverifier','cli','dist','bin.js'),home=join(root,'.aav'),canary='AAV_CERTIFICATION_CANARY_7829',env={...process.env,AAV_HOME:home,AAV_DEMO_CANARY:canary};
for(const name of ['protocol','core','verifier','gateway','storage-sqlite','mcp','cli']){const resolved=realpathSync(join(root,'node_modules','@agentactionverifier',name));assert.ok(resolved.startsWith(root),'resolution escaped clean-room install');}
const manage=args=>execute(process.execPath,[cli,...args],{cwd:root,env});
const cliVersion=(await manage(['--version'])).stdout.trim();
assert.equal(cliVersion,'0.1.0-alpha.0');assert.match((await manage(['--help'])).stdout,/receipt verify/);
const init=JSON.parse((await manage(['init','--name','independent packed install','--json'])).stdout);env.AAV_AUTH_TOKEN=init.bootstrapToken;
await manage(['mcp','add','demo','--command',process.execPath,'--arg',cli,'--arg','demo-server','--credential-env','AAV_DEMO_CANARY']);
await manage(['policy','add','--tool','demo:echo','--decision','ALLOW']);await manage(['policy','add','--tool','demo:dangerous_action','--decision','REQUIRE_APPROVAL']);assert.equal(JSON.parse((await manage(['doctor','--json'])).stdout).result.errors,0);
const receiptFile=join(home,'receipts','certified.json');
const data=await certify({open:()=>connect(process.execPath,[cli,'start'],env),close:client=>client.close(),manage,canary,saveReceipt:async shown=>{writeFileSync(receiptFile,shown);return manage(['receipt','verify',receiptFile,'--json']);}});
function scan(dir){for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())scan(path);else assert.equal(readFileSync(path).includes(Buffer.from(canary)),false,'canary leaked to persisted local state');}}scan(home);
console.log(JSON.stringify({...data,cliVersion,cloudEnvironmentRequired:false,moduleResolution:'all seven packages resolve inside clean-room install'}));
