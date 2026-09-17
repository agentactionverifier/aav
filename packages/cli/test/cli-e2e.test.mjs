import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const cli=fileURLToPath(new URL('../dist/bin.js',import.meta.url));
const run=(home,args,env={})=>spawnSync(process.execPath,[cli,...args],{env:{...process.env,AAV_HOME:home,...env},encoding:'utf8'});
const parse=result=>JSON.parse(result.content[0].text);

test('CLI init, management, protected MCP flow, receipts, canary isolation and restart',async t=>{
  const home=mkdtempSync(join(tmpdir(),'aav-cli-')),canary='AAV_CANARY_DO_NOT_LEAK_7ccaf13';
  assert.match(run(home,['--help']).stdout,/doctor \[--json\]/);assert.match(run(home,['--version']).stdout,/0\.1\.0-alpha\.0/);
  const initialized=run(home,['init','--name','Clean Room','--json']);assert.equal(initialized.status,0,initialized.stderr);const init=JSON.parse(initialized.stdout),token=init.bootstrapToken;
  assert.equal(readFileSync(join(home,'config.json'),'utf8').includes(token),false);assert.notEqual(run(home,['init']).status,0);
  assert.equal(run(home,['mcp','add','demo','--command',process.execPath,'--arg',cli,'--arg','demo-server','--credential-env','AAV_DEMO_CANARY']).status,0);
  assert.equal(run(home,['policy','add','--tool','demo:echo','--decision','ALLOW']).status,0);
  assert.equal(run(home,['policy','add','--tool','demo:dangerous_action','--decision','REQUIRE_APPROVAL']).status,0);
  const doctor=run(home,['doctor','--json'],{AAV_AUTH_TOKEN:token,AAV_DEMO_CANARY:canary});assert.equal(doctor.status,0,doctor.stderr);assert.equal(JSON.parse(doctor.stdout).result.errors,0);
  const connect=async()=>{const transport=new StdioClientTransport({command:process.execPath,args:[cli,'start'],env:{...process.env,AAV_HOME:home,AAV_AUTH_TOKEN:token,AAV_DEMO_CANARY:canary},stderr:'pipe'}),client=new Client({name:'clean-room-client',version:'1'},{capabilities:{}});transport.stderr?.on('data',chunk=>process.stderr.write(chunk));await client.connect(transport);return{client,transport};};
  let session=await connect();t.after(async()=>session.client.close().catch(()=>{}));
  const listed=await session.client.listTools();assert.deepEqual(listed.tools.map(x=>x.name).sort(),['demo:dangerous_action','demo:echo','demo:read_demo']);
  const allowed=await session.client.callTool({name:'demo:echo',arguments:{text:'hello'}});assert.equal(parse(allowed).content[0].text.includes('hello'),true);
  const denied=await session.client.callTool({name:'demo:read_demo',arguments:{}});assert.equal(parse(denied).error.code,'POLICY_DENIED');
  const pending=await session.client.callTool({name:'demo:dangerous_action',arguments:{reason:'test'}}),pendingError=parse(pending).error;assert.equal(pendingError.code,'APPROVAL_REQUIRED');
  const approved=run(home,['approval','approve',pendingError.approvalRequestId,'--json'],{AAV_AUTH_TOKEN:token,AAV_DEMO_CANARY:canary});assert.equal(approved.status,0,approved.stderr);
  const shown=run(home,['runs','show',allowed._meta.aav.runId,'--json']);assert.equal(shown.status,0,shown.stderr);const bundle=JSON.parse(shown.stdout),receiptFile=join(home,'receipts','test.json');writeFileSync(receiptFile,JSON.stringify({receipt:bundle.receipt,events:bundle.events}));assert.equal(run(home,['receipt','verify',receiptFile]).status,0);
  await session.client.close();session=await connect();assert.ok((await session.client.listTools()).tools.some(x=>x.name==='demo:echo'));await session.client.callTool({name:'demo:echo',arguments:{text:'after restart'}});await session.client.close();
  assert.ok(JSON.parse(run(home,['runs','list','--json']).stdout).length>=4);assert.equal(JSON.parse(run(home,['status','--json']).stdout).runtime,'UNKNOWN');
  for(const file of ['config.json','data/aav.db','receipts/test.json'])assert.equal(readFileSync(join(home,file)).includes(Buffer.from(canary)),false,`${file} leaked canary`);
  for(const output of [doctor.stdout,doctor.stderr,allowed.content[0].text,denied.content[0].text,pending.content[0].text,approved.stdout,approved.stderr])assert.equal(output.includes(canary),false);
});

test('CLI uses documented exit codes',()=>{const home=mkdtempSync(join(tmpdir(),'aav-cli-exit-'));assert.equal(run(home,['unknown']).status,2);assert.equal(run(home,['status']).status,3);const file=join(home,'bad.json');writeFileSync(file,'{}');assert.equal(run(home,['receipt','verify',file]).status,6);});
