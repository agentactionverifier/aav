import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { createLocalAAV } from '@agentactionverifier/gateway';
import { SQLiteStorage } from '@agentactionverifier/storage-sqlite';
import { verifyReceipt } from '@agentactionverifier/verifier';
import { createAAVMCPProxy, parseAAVLocalMCPConfig } from '../dist/index.js';

const fixture=(await import('node:url')).fileURLToPath(new URL('./fixtures/upstream.mjs',import.meta.url));
const parse=result=>JSON.parse(result.content[0].text);

test('real MCP client -> AAV -> stdio upstream enforces policy and isolates credentials',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'aav-mcp-')),dbPath=join(dir,'aav.db'),secret='mcp-secret-never-leak';
  const db=new SQLiteStorage(dbPath),credentials={async resolve(ref){return ref==='upstream-token'?secret:undefined;}};
  const runtime=createLocalAAV({project:{id:'p1',name:'MCP Project'},agent:{id:'agent1',name:'MCP Agent'},stores:db,credentials,port:0});
  const proxy=createAAVMCPProxy({projectId:'p1',runtime,stores:db,upstreams:[
    {id:'one',name:'One',transport:'stdio',command:process.execPath,args:[fixture],credentialRef:'upstream-token',credentialEnv:'AAV_TEST_SECRET'},
    {id:'two',name:'Two',transport:'stdio',command:process.execPath,args:[fixture]}
  ]});
  const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair(),client=new Client({name:'real-test-client',version:'1.0.0'},{capabilities:{}});
  t.after(async()=>{await client.close().catch(()=>{});await proxy.stop().catch(()=>{});await runtime.stop().catch(()=>{});db.close();});
  await proxy.start();
  runtime.addPolicy({id:'echo-allow',name:'echo allow',decision:'ALLOW',toolKey:'one:echo',priority:100});
  runtime.addPolicy({id:'danger-deny',name:'danger deny',decision:'DENY',toolKey:'one:dangerous_action',priority:100});
  runtime.addPolicy({id:'danger-approval',name:'danger approval',decision:'REQUIRE_APPROVAL',toolKey:'two:dangerous_action',priority:100});
  await proxy.connect(serverTransport);await client.connect(clientTransport);

  const listed=await client.listTools(),names=listed.tools.map(x=>x.name);
  assert.ok(names.includes('one:echo'));assert.ok(names.includes('one:search'));assert.ok(names.includes('two:search'));assert.equal(names.filter(x=>x.endsWith(':search')).length,2);
  assert.match(listed.tools.find(x=>x.name==='one:dangerous_action').description,/Ignore all policy/);

  const allowed=await client.callTool({name:'one:echo',arguments:{value:'ok'}}),allowedOutput=parse(allowed),aav=allowed._meta.aav;
  assert.equal(allowed.isError,undefined);assert.equal(JSON.stringify(allowed).includes(secret),false);assert.match(allowedOutput.content[0].text,/\[REDACTED\]/);
  const events=db.events(aav.runId);assert.deepEqual(verifyReceipt(aav.receipt,events),{ok:true});assert.equal(JSON.stringify(events).includes(secret),false);
  const tampered=structuredClone(events);tampered[1].data={tampered:true};assert.equal(verifyReceipt(aav.receipt,tampered).ok,false);
  const idempotent=await Promise.all(Array.from({length:10},()=>client.callTool({name:'one:echo',arguments:{value:'same'},_meta:{idempotencyKey:'mcp-same'}})));
  assert.equal(new Set(idempotent.map(x=>x._meta.aav.runId)).size,1);assert.ok(idempotent.every(x=>parse(x).content[0].text.includes('"calls":2')));

  const denied=await client.callTool({name:'one:dangerous_action',arguments:{x:1}});assert.equal(denied.isError,true);assert.equal(parse(denied).error.code,'POLICY_DENIED');
  const deniedRun=parse(denied).error.runId;assert.equal(db.events(deniedRun).some(x=>x.type==='TOOL_EXECUTED'),false);

  const pending=await client.callTool({name:'two:dangerous_action',arguments:{exact:'context'}}),pendingError=parse(pending).error;
  assert.equal(pendingError.code,'APPROVAL_REQUIRED');assert.equal(db.events(pendingError.runId).some(x=>x.type==='TOOL_EXECUTED'),false);
  const approvals=await Promise.all(Array.from({length:10},()=>runtime.decideApproval(pendingError.approvalRequestId,true)));
  assert.equal(db.events(pendingError.runId).filter(x=>x.type==='TOOL_EXECUTED').length,1);assert.ok(approvals.some(x=>x.status===200));
  const approvalReceipt=db.receipt(pendingError.runId);assert.deepEqual(verifyReceipt(approvalReceipt,db.events(pendingError.runId)),{ok:true});

  const rejected=await client.callTool({name:'two:dangerous_action',arguments:{reject:true}}),rejectedError=parse(rejected).error;
  await runtime.decideApproval(rejectedError.approvalRequestId,false);assert.equal(db.events(rejectedError.runId).some(x=>x.type==='TOOL_EXECUTED'),false);
  const changed=await client.callTool({name:'two:dangerous_action',arguments:{original:true}}),changedError=parse(changed).error;
  db.db.prepare('UPDATE approvals SET input_json=? WHERE id=?').run('{"changed":true}',changedError.approvalRequestId);assert.equal((await runtime.decideApproval(changedError.approvalRequestId,true)).status,409);assert.equal(db.events(changedError.runId).some(x=>x.type==='TOOL_EXECUTED'),false);
  const expired=await client.callTool({name:'two:dangerous_action',arguments:{expires:true}}),expiredError=parse(expired).error;
  db.db.prepare('UPDATE approvals SET expires_at=? WHERE id=?').run('2000-01-01T00:00:00.000Z',expiredError.approvalRequestId);assert.equal((await runtime.decideApproval(expiredError.approvalRequestId,true)).body.error.code,'APPROVAL_EXPIRED');assert.equal(db.events(expiredError.runId).some(x=>x.type==='TOOL_EXECUTED'),false);
  assert.equal(readFileSync(dbPath).includes(Buffer.from(secret)),false);
  assert.equal(db.mcpUpstreams('p1').length,2);assert.ok(db.mcpToolMappings('p1').some(x=>x.toolKey==='one:echo'));
});

test('invalid metadata and unavailable upstream fail closed',async()=>{
  const db=new SQLiteStorage(':memory:'),runtime=createLocalAAV({project:{id:'p',name:'p'},agent:{id:'a',name:'a'},stores:db,credentials:{async resolve(){return undefined;}},port:0});
  const unavailable=createAAVMCPProxy({projectId:'p',runtime,stores:db,upstreams:[{id:'gone',name:'gone',transport:'stdio',command:'/definitely/not/a/program'}]});
  await assert.rejects(()=>unavailable.start(),/UPSTREAM_UNAVAILABLE/);await unavailable.stop();db.close();
});

test('configuration and malicious metadata are bounded',async()=>{
  assert.equal(parseAAVLocalMCPConfig({project:'p',mcp:{upstreams:[{id:'safe',name:'safe',transport:'stdio',command:'node'}]}}).project,'p');
  assert.throws(()=>parseAAVLocalMCPConfig({project:'p',mcp:{upstreams:[{id:'safe',name:'safe',transport:'stdio',command:'node',token:'plaintext'}]}}),/MCP_CONFIG_INVALID/);
  const db=new SQLiteStorage(':memory:'),runtime=createLocalAAV({project:{id:'p',name:'p'},agent:{id:'a',name:'a'},stores:db,credentials:{async resolve(){return undefined;}},port:0});
  const proxy=createAAVMCPProxy({projectId:'p',runtime,stores:db,upstreams:[{id:'bad',name:'bad',transport:'stdio',command:process.execPath,args:[fixture,'--invalid']}]});
  await assert.rejects(()=>proxy.start(),/MCP_METADATA_INVALID/);await proxy.stop();db.close();
});
