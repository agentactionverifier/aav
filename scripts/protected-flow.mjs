import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { spawn } from 'node:child_process';

export function execute(command,args,{cwd,env,input}={}){
  return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd,env,stdio:['pipe','pipe','pipe'],shell:process.platform==='win32'&&/\.(?:cmd|bat)$/.test(command)});let stdout='',stderr='';child.stdout.on('data',x=>stdout+=x);child.stderr.on('data',x=>stderr+=x);child.on('error',reject);const timeout=setTimeout(()=>{child.kill();reject(new Error(`${command} timed out`));},60000);child.on('close',code=>{clearTimeout(timeout);if(code!==0)reject(new Error(`${command} failed (${code}): ${stderr}`));else resolve({stdout,stderr});});child.stdin.end(input);});
}
export async function connect(command,args,env){const transport=new StdioClientTransport({command,args,env,stderr:'pipe'}),client=new Client({name:'candidate-certification',version:'1.0.0'},{capabilities:{}});await client.connect(transport);return client;}
export async function certify({open,close,manage,saveReceipt,canary}){
  let client=await open();const outputs=[];
  try{
    const listed=await client.listTools();assert.deepEqual(listed.tools.map(x=>x.name).sort(),['demo:dangerous_action','demo:echo','demo:read_demo']);
    const allowed=await client.callTool({name:'demo:echo',arguments:{text:'certified'}});assert.notEqual(allowed.isError,true);assert.match(JSON.stringify(allowed),/certified/);
    const denied=await client.callTool({name:'demo:read_demo',arguments:{}});assert.equal(JSON.parse(denied.content[0].text).error.code,'POLICY_DENIED');
    const pending=await client.callTool({name:'demo:dangerous_action',arguments:{reason:'approval certification'}}),error=JSON.parse(pending.content[0].text).error;assert.equal(error.code,'APPROVAL_REQUIRED');
    const before=JSON.parse((await manage(['runs','show',error.runId,'--json'])).stdout);assert.equal(before.events.filter(x=>x.type==='TOOL_EXECUTED').length,0);
    const decisions=await Promise.all(Array.from({length:8},()=>manage(['approval','approve',error.approvalRequestId,'--json'])));
    const approved=JSON.parse((await manage(['runs','show',error.runId,'--json'])).stdout);assert.equal(approved.events.filter(x=>x.type==='TOOL_EXECUTED').length,1);assert.equal(approved.receiptStatus.ok,true);
    const shown=(await manage(['runs','show',allowed._meta.aav.runId,'--json'])).stdout,bundle=JSON.parse(shown);assert.equal(bundle.receiptStatus.ok,true);
    const verified=await saveReceipt(shown);assert.equal(JSON.parse(verified.stdout).ok,true);
    outputs.push(listed,allowed,denied,pending,bundle,approved,decisions,verified);
    await close(client);client=await open();assert.ok((await client.listTools()).tools.some(x=>x.name==='demo:echo'));const restarted=JSON.parse((await manage(['runs','show',allowed._meta.aav.runId,'--json'])).stdout);assert.equal(restarted.receiptStatus.ok,true);await client.callTool({name:'demo:echo',arguments:{text:'after restart'}});
    const runs=JSON.parse((await manage(['runs','list','--json'])).stdout);assert.ok(runs.length>=4);assert.equal(JSON.stringify(outputs).includes(canary),false);
    return{ok:true,toolsList:true,allow:true,deny:true,requireApproval:true,approvalContinuation:true,approvalRaceCalls:8,singleToolExecutedEvent:true,receiptVerify:true,restartPersistence:true,secretCanaryLeaks:0,runs:runs.length};
  }finally{await close(client).catch(()=>{});}
}
