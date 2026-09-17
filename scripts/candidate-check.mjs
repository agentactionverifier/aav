import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const label=path=>relative(root,path).split(sep).join('/');
const within=path=>{const r=relative(root,path);return r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r);};
const packages=['protocol','core','verifier','gateway','storage-sqlite','mcp','cli'];
const ignored=new Set(['node_modules','.git','dist','.turbo','packs']);
const run=(command,args,cwd=root)=>{const result=spawnSync(command,args,{cwd,encoding:'utf8',shell:process.platform==='win32'});if(result.status!==0)throw new Error(`${command} failed: ${result.stderr || result.stdout}`);return result.stdout;};
const files=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const path=join(dir,entry.name);if(entry.isSymbolicLink())throw new Error(`Exported symlink: ${relative(root,path)}`);if(entry.isDirectory())walk(path);else files.push(path);}}
walk(root);
function report(name,value){mkdirSync(join(root,'certification'),{recursive:true});writeFileSync(join(root,'certification',`${name}.json`),JSON.stringify(value,null,2)+'\n');console.log(JSON.stringify(value,null,2));}

function scan(){
  const privateMatches=[],secretMatches=[],reviewed=[];
  const forbidden=/apps\/(?:api|web|marketing)|@agent-auditor\/|Agent Auditor|@prisma\/|CommercialPlan|PlanEntitlement|PlatformAdmin|railway\.(?:app|toml)|\b(?:STRIPE|RESEND|DATABASE_URL|REDIS_URL)\b|agentactionverifier\.com/;
  const secretPatterns=[['AWS',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],['GitHub',/\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],['Stripe',/\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}\b/],['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['JWT',/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],['Bearer',/Bearer\s+[A-Za-z0-9._~+\/-]{24,}/]];
  const entropy=s=>{const counts=new Map();for(const c of s)counts.set(c,(counts.get(c)??0)+1);return -[...counts.values()].reduce((sum,n)=>sum+n/s.length*Math.log2(n/s.length),0);};
  for(const path of files){const file=label(path);if(file==='scripts/candidate-check.mjs'||file.startsWith('certification/'))continue;
    if(file==='FILES_EXCLUDED.txt'){reviewed.push({file,classification:'requested provenance inventory of excluded source paths; no private implementation'});continue;}
    if(/(?:^|\/)\.env(?:\.|$)/.test(file)||/\.db(?:-wal|-shm)?$/.test(file))secretMatches.push({file,kind:'persisted environment/database'});
    const text=readFileSync(path,'utf8');
    if(/\.[cm]?[jt]s$/.test(file))for(const match of text.matchAll(/(?:from\s*|import\s*\()['"]([.][^'"]+)['"]/g)){if(!within(resolve(dirname(path),match[1])))privateMatches.push({file,kind:'relative import escapes candidate'});}
    for(const [index,line] of text.split('\n').entries()){
      // Owner-approved reporting address is public security metadata, not a Cloud endpoint.
      const approvedContactFiles=new Set(['SECURITY.md','README.md','SECURITY-RELEASE-CHECKLIST.md']);
      const checkedLine=approvedContactFiles.has(file)?line.replaceAll('security@agentactionverifier.com',''):line;
      if(forbidden.test(checkedLine))privateMatches.push({file,line:index+1,kind:'private marker'});
      for(const [kind,pattern]of secretPatterns)if(pattern.test(line))secretMatches.push({file,line:index+1,kind});
      // Only credential-like literal assignments; lock integrity, protocol digests and regexes are not credentials.
      for(const match of line.matchAll(/(?:token|secret|password|apiKey)\s*[:=]\s*['"]([^'"]{24,})['"]/gi)){
        const value=match[1];if(!/dummy|canary|example|test|placeholder|the one-time/i.test(value)&&!/^\$|^Bearer \$/.test(value)&&entropy(value)>4.2)secretMatches.push({file,line:index+1,kind:'high-entropy credential literal'});
      }
      if(/\b(?:tokens?|passwords?|operations|tenantId|organizationId|internal tenant)\b/i.test(line))reviewed.push({file,line:index+1,classification:'generic local API/credential contract, synthetic fixture or security documentation; not production configuration'});
    }
  }
  report('scan',{ok:privateMatches.length===0&&secretMatches.length===0,filesScanned:files.length,privateMatches,secretMatches,reviewedMatches:reviewed});
  if(privateMatches.length||secretMatches.length)throw new Error('Defensive scan failed; stop release preparation');
}
function docs(){const broken=[];for(const path of files.filter(x=>x.endsWith('.md'))){const text=readFileSync(path,'utf8');for(const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){const target=match[1].split('#')[0];if(!target||/^(?:https?:|mailto:)/.test(target))continue;const absolute=resolve(dirname(path),target);if(!within(absolute)||!existsSync(absolute))broken.push({file:label(path),target});}if(/\/(?:workspaces|home|tmp)\//.test(text))broken.push({file:label(path),kind:'absolute local path'});}report('docs',{ok:broken.length===0,broken});if(broken.length)throw new Error('Broken documentation paths');}
function pack(){const output=mkdtempSync(join(tmpdir(),'aav-candidate-packs-')),results=[];for(const name of packages)run('pnpm',['--filter',`@agentactionverifier/${name}`,'pack','--pack-destination',output]);for(const file of readdirSync(output)){const path=join(output,file),listing=run('tar',['-tzf',path]).trim().split('\n'),manifest=JSON.parse(run('tar',['-xOzf',path,'package/package.json']));const bad=listing.filter(x=>/(?:^|\/)(?:\.env|\.aav|node_modules|test|\.git|\.turbo)(?:\/|$)|\.db(?:-wal|-shm)?$|apps\//.test(x));if(bad.length)throw new Error(`${file}: prohibited packed files`);if(readFileSync(path).length>1_000_000)throw new Error(`${file}: unexpectedly large archive`);results.push({package:manifest.name,version:manifest.version,tarball:file,bytes:statSync(path).size,fileCount:listing.length});}report('pack',{ok:true,output,packages:results});}
function licenses(){
  const manifests=new Map(),edges=new Map();
  function manifest(path){const real=realpathSync(path);if(!manifests.has(real))manifests.set(real,JSON.parse(readFileSync(real,'utf8')));return real;}
  function locate(base,name){let cursor=dirname(base);while(true){const path=join(cursor,'node_modules',name,'package.json');if(existsSync(path))return manifest(path);const parent=dirname(cursor);if(parent===cursor)throw new Error(`Missing dependency manifest ${name}`);cursor=parent;}}
  function traverse(path,set){path=manifest(path);if(set.has(path))return;set.add(path);const pkg=manifests.get(path),dependencies=[];for(const name of Object.keys({...pkg.dependencies,...pkg.optionalDependencies})){let dep;try{dep=locate(path,name);}catch(error){if(pkg.optionalDependencies?.[name])continue;throw error;}dependencies.push(dep);traverse(dep,set);}edges.set(path,dependencies);}
  const prod=new Set(),dev=new Set();for(const name of packages)traverse(join(root,'packages',name,'package.json'),prod);
  const roots=[join(root,'package.json'),...packages.map(name=>join(root,'packages',name,'package.json'))];
  for(const path of roots){const pkg=JSON.parse(readFileSync(path,'utf8'));for(const name of Object.keys(pkg.devDependencies??{}))traverse(locate(path,name),dev);}
  const external=path=>!manifests.get(path).name.startsWith('@agentactionverifier/');
  const row=path=>{const p=manifests.get(path);return{name:p.name,version:p.version,license:typeof p.license==='string'?p.license:'UNKNOWN',scope:prod.has(path)?'production':'development'};};
  const all=[...new Set([...prod,...dev])].filter(external),inventory=all.map(row).sort((a,b)=>a.name.localeCompare(b.name));
  const flagged=inventory.filter(x=>x.scope==='production'?!['MIT','ISC'].includes(x.license):/AGPL|GPL|SSPL|BUSL|Commons Clause|UNKNOWN|UNLICENSED/i.test(x.license));
  mkdirSync(join(root,'third-party-licenses'),{recursive:true});
  const notices=[],evidenceByPackage=new Map(),evidenceFiles=[];
  const lock=readFileSync(join(root,'pnpm-lock.yaml'),'utf8');
  for(const path of all){
    const p=manifests.get(path),base=dirname(path),evidence=[],copyright=[],licenseEvidenceFlags=[];
    if(!lock.includes(`${p.name}@${p.version}`))throw new Error(`Dependency absent from frozen lockfile: ${p.name}@${p.version}`);
    function collect(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){
      if(entry.name==='node_modules'||entry.isSymbolicLink())continue;
      const source=join(dir,entry.name);if(entry.isDirectory()){collect(source);continue;}
      if(!entry.isFile()||!(/^(?:licen[sc]e|copying)(?:\.|$)|notice/i.test(entry.name)))continue;
      const sourceFile=relative(base,source).split(sep).join('/');
      const dest=`${p.name.replace(/[^a-z0-9.-]/gi,'_')}-${p.version}-${sourceFile.replaceAll('/','__')}`;
      const bytes=readFileSync(source),hash=createHash('sha256').update(bytes).digest('hex');
      cpSync(source,join(root,'third-party-licenses',dest));evidence.push(dest);
      evidenceFiles.push({package:p.name,version:p.version,scope:prod.has(path)?'production':'development',sourceFile,file:dest,sha256:hash});
      const text=bytes.toString('utf8');
      for(const line of text.split('\n'))if(/^\s*(?:[*#]\s*)?(?:copyright|©).*?(?:\b(?:19|20)\d{2}\b|\(c\)\s+\p{Lu})/iu.test(line)&&!/(?:\[yyyy\]|\[name of copyright owner\]|copyright notice|copyright holder|copyright permission|copyright license)/i.test(line))copyright.push(line.trim());
      if(/licensing transition/i.test(text))licenseEvidenceFlags.push('UPSTREAM_LICENSE_TRANSITION: HUMAN_LEGAL_REVIEW_REQUIRED');
      if(/Apache License|Apache-2\.0/.test(text)&&p.license!=='Apache-2.0')licenseEvidenceFlags.push('APACHE_TEXT_OR_REFERENCE_BEYOND_METADATA: HUMAN_LEGAL_REVIEW_REQUIRED');
      if(/CC-BY-4\.0|Creative Commons Attribution/.test(text))licenseEvidenceFlags.push('CC_BY_DOCUMENTATION_REFERENCE: artifact applicability requires human review');
      if(/notice/i.test(entry.name))notices.push({package:p.name,version:p.version,sourceFile,file:dest,scope:prod.has(path)?'production':'development',requiresHumanReview:true});
    }}collect(base);
    evidenceByPackage.set(`${p.name}@${p.version}`,{evidence,copyright:[...new Set(copyright)],licenseEvidenceFlags:[...new Set(licenseEvidenceFlags)]});
  }
  const enriched=inventory.map(p=>({...p,...evidenceByPackage.get(`${p.name}@${p.version}`)}));
  writeFileSync(join(root,'DEPENDENCY-LICENSES.json'),JSON.stringify({legalApproval:'PENDING',production:enriched.filter(x=>x.scope==='production'),development:enriched.filter(x=>x.scope==='development'),flagged,evidenceFiles,notices,closure:'seven workspace production dependency roots, frozen lockfile, installed host transitives; development-only means not in production closure'},null,2)+'\n');
  const escape=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
  const table=scope=>'| Package | Version | SPDX license | Copyright / attribution evidence | License evidence file |\n| --- | --- | --- | --- | --- |\n'+enriched.filter(p=>p.scope===scope).map(p=>`| ${escape(p.name)} | ${escape(p.version)} | ${escape(p.license)} | ${p.copyright.map(escape).join('<br>')||'Not available in scanned evidence; no attribution invented'} | ${p.evidence.map(n=>`[${escape(n)}](third-party-licenses/${n})`).join(', ')||'MISSING: HUMAN_LEGAL_REVIEW_REQUIRED'} |`).join('\n');
  const evidenceReview=enriched.filter(p=>p.scope==='production'&&p.licenseEvidenceFlags.length);
  writeFileSync(join(root,'THIRD_PARTY_LICENSES.md'),'# Third-party license evidence\n\nAAV itself uses candidate Apache-2.0; see LICENSE and NOTICE. LEGAL_APPROVAL: PENDING. SPDX values below are declared package metadata, not a determination of all bundled-license obligations. Copyright rows are verbatim evidence excerpts, not verified ownership determinations. The scope is the installed Linux x64 graph matched to the frozen lockfile; OS/Node image components and non-host optional binaries need separate review.\n\n## Production dependencies\n\n'+table('production')+'\n\n### Production evidence requiring interpretation\n\n'+evidenceReview.map(p=>`- ${p.name}@${p.version}: ${p.licenseEvidenceFlags.join('; ')}. See its complete preserved LICENSE; do not treat metadata MIT as the full legal determination.`).join('\n')+'\n\n## Development dependencies\n\n'+table('development')+'\n\nTypeScript is DEVELOPMENT-ONLY. Its bundled third-party notice is retained here for development/source-distribution review; it is not part of the final npm --omit=dev runtime installation and is not promoted into AAV runtime NOTICE. Development notices apply only to artifacts actually redistributed.\n\nUpstream production NOTICE scan: '+JSON.stringify(notices.filter(p=>p.scope==='production'))+'. The scan does not decide legal propagation requirements. HUMAN_LEGAL_REVIEW_REQUIRED.\n');
  const ref=p=>`pkg:npm/${p.name.replace('@','%40')}@${p.version}`;
  const sbomPaths=[...new Set([...prod,...dev])];
  const components=sbomPaths.map(row).map(p=>{
    const evidence=enriched.find(x=>x.name===p.name&&x.version===p.version);
    return {type:'library',name:p.name,version:p.version,'bom-ref':ref(p),purl:ref(p),scope:p.scope==='production'?'required':'optional',licenses:[/\s|\(|\)/.test(p.license)?{expression:p.license}:{license:{id:p.license}}],properties:[{name:'aav:license-source',value:'declared package metadata; not legal approval'},...(evidence?[{name:'aav:preserved-license-evidence',value:JSON.stringify(evidence.evidence)},...(evidence.licenseEvidenceFlags.length?[{name:'aav:license-evidence-review',value:JSON.stringify(evidence.licenseEvidenceFlags)}]:[])]:[])]};
  });
  const dependencies=[{ref:'aav-candidate',dependsOn:packages.map(name=>ref(row(manifest(join(root,'packages',name,'package.json')))))},...sbomPaths.map(path=>({ref:ref(row(path)),dependsOn:(edges.get(path)??[]).map(x=>ref(row(x)))}))];
  writeFileSync(join(root,'sbom.cdx.json'),JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.5',serialNumber:`urn:uuid:${randomUUID()}`,version:1,metadata:{timestamp:new Date().toISOString(),component:{type:'application',name:'aav',version:'0.1.0-alpha.0','bom-ref':'aav-candidate'}},components,dependencies},null,2)+'\n');
  const missing=enriched.filter(p=>p.scope==='production'&&p.evidence.length===0);
  report('licenses',{ok:flagged.filter(x=>x.scope==='production').length===0&&missing.length===0,production:inventory.filter(x=>x.scope==='production').length,development:inventory.filter(x=>x.scope==='development').length,flagged,notices,missingProductionEvidence:missing,evidenceFileCount:evidenceFiles.length,productionLicenseEvidenceReview:evidenceReview,legalApproval:'PENDING'});
  if(flagged.some(x=>x.scope==='production')||missing.length)throw new Error('Unexpected production license family or missing license evidence; stop attribution certification');
}
const command=process.argv[2];if(command==='scan')scan();else if(command==='docs')docs();else if(command==='pack')pack();else if(command==='licenses')licenses();else throw new Error('Expected scan, docs, pack or licenses');
