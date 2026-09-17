import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execute, connect, certify } from './protected-flow.mjs';

const image=process.env.AAV_TEST_IMAGE??'aav-local:candidate',suffix=Date.now().toString(36),volume=`aav-cert-${suffix}`,name=`aav-cert-${suffix}`,canary='AAV_RELEASE_CANARY_'+randomBytes(24).toString('hex'),env={...process.env,AAV_DEMO_CANARY:canary};
const docker=(args,input)=>execute('docker',args,{env,input});
const run=args=>docker(['run','--rm','-v',`${volume}:/data`,image,...args]);
await docker(['volume','create',volume]);
try{
  const uid=(await docker(['run','--rm','--entrypoint','id',image,'-u'])).stdout.trim();if(uid!=='1000')throw new Error(`Expected non-root UID 1000, got ${uid}`);
  const init=JSON.parse((await run(['init','--name','Docker independent','--json'])).stdout);env.AAV_AUTH_TOKEN=init.bootstrapToken;
  await run(['mcp','add','demo','--command','node','--arg','/app/node_modules/@agentactionverifier/cli/dist/bin.js','--arg','demo-server','--credential-env','AAV_DEMO_CANARY']);await run(['policy','add','--tool','demo:echo','--decision','ALLOW']);await run(['policy','add','--tool','demo:dangerous_action','--decision','REQUIRE_APPROVAL']);
  const manage=args=>docker(['exec',name,'/app/node_modules/.bin/aav',...args]);
  const open=()=>connect('docker',['run','--rm','--name',name,'-i','-e','AAV_AUTH_TOKEN','-e','AAV_DEMO_CANARY','-v',`${volume}:/data`,image,'start'],env);
  const close=async client=>{await docker(['stop','-t','5',name]).catch(()=>{});await client.close();};
  const saveReceipt=async shown=>{await docker(['exec','-i',name,'node','-e',"let data='';process.stdin.on('data',x=>data+=x);process.stdin.on('end',()=>require('node:fs').writeFileSync('/data/receipts/docker.json',data));"],shown);return manage(['receipt','verify','/data/receipts/docker.json','--json']);};
  const result=await certify({open,close,manage,saveReceipt,canary});result.uniqueCanary=true;
  const scan="const fs=require('node:fs'),path=require('node:path');function walk(d){for(const n of fs.readdirSync(d)){const p=path.join(d,n);if(fs.statSync(p).isDirectory())walk(p);else if(fs.readFileSync(p).includes(Buffer.from(process.env.AAV_DEMO_CANARY)))throw Error('canary leaked');}}walk('/data');console.log('canary-clean');";
  await docker(['run','--rm','-e','AAV_DEMO_CANARY','-v',`${volume}:/data`,'--entrypoint','node',image,'-e',scan.replace("walk('/data')","walk('/data');walk('/app')")]);
  mkdirSync('certification',{recursive:true});const data={...result,image,nonRootUid:Number(uid),persistentVolume:true,publicContextOnly:true};writeFileSync('certification/docker.json',JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data,null,2));
}finally{await docker(['rm','-f',name]).catch(()=>{});await docker(['volume','rm',volume]).catch(()=>{});}
