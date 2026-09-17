import { execute } from './protected-flow.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const project=`aav-example-${Date.now().toString(36)}`,env={...process.env,AAV_AUTH_TOKEN:'AAV_INITIALIZATION_PLACEHOLDER'},args=['compose','-p',project,'-f','examples/docker-compose/compose.yaml'];
const compose=more=>execute('docker',[...args,...more],{env});
try{
  await compose(['config','--quiet']);await compose(['build']);
  const init=JSON.parse((await compose(['run','--rm','-T','aav-local','init','--name','Compose example','--json'])).stdout);env.AAV_AUTH_TOKEN=init.bootstrapToken;
  await compose(['run','--rm','-T','aav-local','mcp','add','demo','--command','node','--arg','/app/node_modules/@agentactionverifier/cli/dist/bin.js','--arg','demo-server']);
  await compose(['run','--rm','-T','aav-local','policy','add','--tool','demo:echo','--decision','ALLOW']);await compose(['up','-d']);
  let status;for(let i=0;i<15;i++){status=JSON.parse((await compose(['exec','-T','aav-local','/app/node_modules/.bin/aav','status','--json'])).stdout);if(status.runtime==='RUNNING')break;await new Promise(r=>setTimeout(r,200));}if(status.runtime!=='RUNNING')throw new Error('Compose runtime not running');
  await compose(['down']);const persisted=JSON.parse((await compose(['run','--rm','-T','aav-local','status','--json'])).stdout);if(persisted.project.name!=='Compose example')throw new Error('Compose volume lost project');
  mkdirSync('certification',{recursive:true});writeFileSync('certification/compose.json',JSON.stringify({ok:true,actualExampleExecuted:true,start:true,persistence:true},null,2)+'\n');console.log('Docker Compose example PASS');
}finally{await compose(['down','-v','--remove-orphans']).catch(()=>{});}
