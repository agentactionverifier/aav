// Read-only Docker distribution evidence check. Never installs or publishes anything.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execute } from './protected-flow.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const inventory=JSON.parse(readFileSync(join(root,'DEPENDENCY-LICENSES.json'),'utf8'));
const payload={production:inventory.production,development:inventory.development,evidenceFiles:inventory.evidenceFiles,aavLicenseSha256:createHash('sha256').update(readFileSync(join(root,'LICENSE'))).digest('hex')};
const image=process.env.AAV_TEST_IMAGE??'aav-local:candidate';
const source=String.raw`
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
let input='';process.stdin.on('data',x=>input+=x);process.stdin.on('end',()=>{
 const expected=JSON.parse(input),base='/app/node_modules',seen=new Map(),roots=['protocol','core','verifier','gateway','storage-sqlite','mcp','cli'];
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 function locate(manifest,name){let dir=path.dirname(manifest);while(true){const p=path.join(dir,'node_modules',name,'package.json');if(fs.existsSync(p))return fs.realpathSync(p);const parent=path.dirname(dir);if(parent===dir)throw Error('Missing runtime dependency '+name);dir=parent;}}
 function visit(manifest){manifest=fs.realpathSync(manifest);assert.ok(manifest.startsWith('/app/'),'Runtime resolution escaped image application');if(seen.has(manifest))return;const p=JSON.parse(fs.readFileSync(manifest));seen.set(manifest,p);for(const n of Object.keys({...p.dependencies,...p.optionalDependencies})){let next;try{next=locate(manifest,n);}catch(e){if(p.optionalDependencies?.[n])continue;throw e;}visit(next);}}
 for(const n of roots)visit(path.join(base,'@agentactionverifier',n,'package.json'));
 const external=[...seen.entries()].filter(([,p])=>!p.name.startsWith('@agentactionverifier/'));
 const key=p=>p.name+'@'+p.version;
 assert.deepEqual(external.map(([,p])=>key(p)).sort(),expected.production.map(key).sort(),'Runtime closure differs from frozen candidate inventory');
 const coverage=[];
 for(const[manifest,p]of external){
  assert.ok(['MIT','ISC'].includes(p.license),'Unexpected production SPDX family');
  const row=expected.production.find(x=>key(x)===key(p));assert.equal(row.license,p.license);
  const evidence=expected.evidenceFiles.filter(x=>x.scope==='production'&&x.package+'@'+x.version===key(p));assert.ok(evidence.length>0,'Missing production license evidence: '+key(p));
  for(const e of evidence){const file=path.join(path.dirname(manifest),e.sourceFile);assert.ok(fs.existsSync(file),'License evidence absent from runtime: '+key(p)+' '+e.sourceFile);assert.equal(hash(file),e.sha256,'Runtime license text mismatch');}
  coverage.push({package:p.name,version:p.version,license:p.license,evidence:evidence.map(x=>({runtimeFile:path.posix.join('/app/node_modules',p.name,x.sourceFile),sha256:x.sha256})),byteIdenticalToInventory:true});
 }
 const devNames=expected.development.map(p=>p.name);
 function installed(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.name==='.bin')continue;const full=path.join(dir,e.name);if(e.name.startsWith('@')&&e.isDirectory()){installed(full);continue;}const manifest=path.join(full,'package.json');if(fs.existsSync(manifest)){const p=JSON.parse(fs.readFileSync(manifest));assert.ok(!devNames.includes(p.name),'Development-only dependency in runtime: '+p.name);}const nested=path.join(full,'node_modules');if(fs.existsSync(nested))installed(nested);}}
 installed(base);assert.ok(!fs.existsSync(path.join(base,'typescript')),'TypeScript unexpectedly installed');
 for(const n of roots)assert.equal(hash(path.join(base,'@agentactionverifier',n,'LICENSE')),expected.aavLicenseSha256);
 console.log(JSON.stringify({ok:true,productionExternalCount:external.length,productionEvidenceRetained:true,coverage,developmentOnlyPackagesAbsent:true,typescriptInstalled:false,aavPackageLicensesRetained:roots.length,productionNoticeFiles:expected.evidenceFiles.filter(x=>x.scope==='production'&&/notice/i.test(x.sourceFile)),legalApproval:'PENDING',scope:'Application npm modules only; OS/Node base-image licenses require separate review'}));
});`;
const result=await execute('docker',['run','--rm','-i','--entrypoint','node',image,'-e',source],{input:JSON.stringify(payload)});
const report={...JSON.parse(result.stdout),image};
mkdirSync(join(root,'certification'),{recursive:true});
writeFileSync(join(root,'certification/runtime-license-coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({ok:report.ok,production:report.productionExternalCount,typescriptInstalled:report.typescriptInstalled,licenseCoverage:report.coverage.length}));
