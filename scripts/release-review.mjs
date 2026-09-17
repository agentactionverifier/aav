// Evidence generator only: no authentication, publication, deployment or runtime changes.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const names=['protocol','core','verifier','gateway','storage-sqlite','mcp','cli'];
const graph={},rows=[];
for(const name of names){
  const p=read(`packages/${name}/package.json`);
  assert.equal(p.name,`@agentactionverifier/${name}`);
  assert.equal(p.version,'0.1.0-alpha.0');
  assert.equal(p.private,true,'Publication must remain deliberately gated');
  assert.equal(p.license,'Apache-2.0');
  assert.equal(p.engines.node,'>=24.0.0');
  assert.deepEqual(p.publishConfig,{access:'public',tag:'alpha',registry:'https://registry.npmjs.org/'});
  assert.equal(p.repository.url,'https://github.com/agentactionverifier/aav.git');
  assert.equal(p.repository.directory,`packages/${name}`);
  assert.equal(p.homepage,'https://github.com/agentactionverifier/aav#readme');
  assert.equal(p.bugs.url,'https://github.com/agentactionverifier/aav/issues');
  for(const field of ['description','exports','types','files'])assert.ok(p[field],`${name}: missing ${field}`);
  const targets=[p.types,...Object.values(p.exports['.']),...Object.values(p.bin??{})];
  for(const target of targets)assert.ok(existsSync(join(root,'packages',name,target)),`${name}: missing ${target}`);
  graph[name]=Object.keys(p.dependencies??{}).filter(n=>n.startsWith('@agentactionverifier/')).map(n=>n.split('/')[1]);
  for(const dependency of graph[name]){
    assert.ok(names.includes(dependency),'SDK or unknown package in public runtime');
    assert.equal(p.dependencies[`@agentactionverifier/${dependency}`],'workspace:*');
    assert.ok(names.indexOf(dependency)<names.indexOf(name),'Publication order violates dependency graph');
  }
  rows.push(p);
}
writeFileSync(join(root,'certification/npm-metadata.json'),JSON.stringify({ok:true,phase:'6.2',publicationDisabled:true,intendedFutureRepositoryNotLive:true,graph,publishOrder:names,packages:rows},null,2)+'\n');

const inventory=read('DEPENDENCY-LICENSES.json');
const store=join(root,'node_modules/.pnpm');
const stores=readdirSync(store);
const escape=s=>String(s).replaceAll('|','\\|').replaceAll('\n',' ');
function details(p){
  for(const entry of stores){
    const path=join(store,entry,'node_modules',p.name,'package.json');
    if(!existsSync(path))continue;
    const meta=JSON.parse(readFileSync(path,'utf8'));
    if(meta.version!==p.version)continue;
    const repo=typeof meta.repository==='string'?meta.repository:meta.repository?.url;
    const source=repo?.replace(/^git\+/,'').replace(/^git:\/\//,'https://')??meta.homepage??'NOT_AVAILABLE_IN_METADATA';
    const licenseFiles=readdirSync(dirname(path)).filter(n=>/^(?:licen[sc]e|copying)(?:\.|$)|notice/i.test(n));
    const evidence=p.evidence??licenseFiles.map(n=>`${p.name.replace(/[^a-z0-9.-]/gi,'_')}-${p.version}-${n}`).filter(n=>existsSync(join(root,'third-party-licenses',n)));
    const notices=evidence.filter(n=>/notice/i.test(n));
    const requirement=p.licenseEvidenceFlags?.length&&p.scope==='production'?'HUMAN_LEGAL_REVIEW_REQUIRED: preserve full evidence and resolve upstream transition / artifact applicability; declared metadata is not the full determination':p.license==='MIT'?'Preserve upstream copyright and permission notice with copies/substantial portions':p.license==='ISC'?'Preserve upstream copyright and permission notice in copies':p.license==='Apache-2.0'?'Include license; retain relevant copyright/attribution; preserve applicable upstream NOTICE; review any modification notices':'HUMAN_INTERPRETATION_REQUIRED';
    return {...p,source,evidence,notices,copyright:p.copyright??[],requirement,reviewStatus:'HUMAN_LEGAL_REVIEW_REQUIRED'};
  }
  throw Error(`Installed dependency metadata missing: ${p.name}@${p.version}`);
}
const prod=inventory.production.map(details),dev=inventory.development.map(details);
const table=rows=>'| Package | Version | Declared SPDX license | Copyright / attribution evidence | Copyright/notice review requirement | Metadata source URL | Evidence | Status |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n'+rows.map(p=>`| ${escape(p.name)} | ${escape(p.version)} | ${escape(p.license)} | ${p.copyright.map(escape).join('<br>')||'Not available; no attribution invented'} | ${escape(p.requirement)} | ${escape(p.source)} | ${p.evidence.map(n=>`[${escape(n)}](third-party-licenses/${n})`).join(', ')||'NO_TEXT_FOUND: HUMAN_REVIEW_REQUIRED'} | ${p.reviewStatus} |`).join('\n');
const text=`# Legal release review — Phase 6.2\n\nApache-2.0 is the candidate project license. **LEGAL_APPROVAL: PENDING.** This document inventories installed metadata and copied upstream license/notice texts, not a legal opinion or compatibility approval. Declared SPDX identifiers are distinguished from the full preserved license evidence. Copyright ownership of the frozen AAV sources must be confirmed by the owner; NOTICE deliberately avoids invented attribution.\n\n## Production dependencies (${prod.length})\n\n${table(prod)}\n\n### Evidence differing from declared metadata\n\n${prod.filter(p=>p.licenseEvidenceFlags?.length).map(p=>`- ${p.name}@${p.version}: ${p.licenseEvidenceFlags.join("; ")}. Complete text is preserved; a metadata SPDX field is not a legal resolution of the transition.`).join("\n")}\n\n## Development-only dependencies (${dev.length})\n\n${table(dev)}\n\nThe production/development boundary is the installed Linux x64 dependency graph. Optional binaries for other hosts are not certified here. The application SBOM excludes Debian/Node image operating-system packages; separate distribution review is required for published images.\n\n## NOTICE and human interpretation\n\nProduction upstream NOTICE files found by the recursive technical evidence scan: ${prod.flatMap(p=>p.notices).length}. No legal propagation determination is implied: HUMAN_LEGAL_REVIEW_REQUIRED. Production LICENSE/COPYING evidence is preserved verbatim separately from AAV attribution. TypeScript 5.9.3 is DEVELOPMENT-ONLY and is not installed by the final runtime image's npm install --omit=dev step. Its license and bundled ThirdPartyNoticeText remain in the development evidence inventory. Embedded Unicode/W3C/Creative Commons materials are not added to root runtime NOTICE; applicability must be reviewed only for artifacts that actually redistribute them, such as source or development environments. No evidence here establishes that AAV redistributes them in the runtime. npm metadata alone is not legal approval.\n\n## Runtime distribution evidence\n\nThe Docker runtime installs production modules using npm install --omit=dev. scripts/runtime-license-check.mjs checks the exact external closure and byte hashes of all production evidence files against the image and confirms that development-only packages, including TypeScript, are absent. See certification/runtime-license-coverage.json for the separately executed result. AAV package LICENSE copies are also checked; image OS/Node licensing is outside this application-module check.\n\n## File-header policy recommendation\n\nFor this frozen alpha, keep the full root LICENSE and a LICENSE in every package; preserve existing third-party copyright/license/NOTICE text. Do not mass-edit the runtime merely to add headers. Recommend short SPDX/license headers for future original files once ownership and project policy are approved. HUMAN_REVIEW_REQUIRED: owner/counsel must decide whether root/package licenses and current notices suffice for each distributed artifact; this is not a claim that headers are legally unnecessary. ASF's policy applies to ASF projects, not automatically to AAV. Evidence: [Apache license section 4](https://www.apache.org/licenses/LICENSE-2.0), [Apache licensing FAQ](https://apache.org/foundation/license-faq.html), [ASF source-header policy](https://www.apache.org/legal/src-headers.html).\n\n## Remaining approvals\n\nSee [MCP review packet](docs/legal/MCP-LICENSE-REVIEW.md) and [copyright review packet](docs/legal/COPYRIGHT-REVIEW.md). Runtime redistribution includes upstream README documentation and CC-BY references; applicability is not resolved by declared metadata. No ownership or legal approval is inferred.\n\nHuman approval of ownership, license choice, per-dependency notices, file-header policy and redistribution scope remains required before npm/image publication. Do not mistake zero automated restrictive-license flags for legal approval.\n`;
writeFileSync(join(root,'LEGAL-RELEASE-REVIEW.md'),text);
writeFileSync(join(root,'certification/legal-review.json'),JSON.stringify({phase:'6.2',ok:true,legalApproval:'PENDING',production:prod,development:dev,fileHeaderPolicy:'RECOMMEND_NO_MASS_EDIT_PENDING_HUMAN_APPROVAL',noticeReview:'HUMAN_LEGAL_REVIEW_REQUIRED',productionNoticeFiles:prod.flatMap(p=>p.notices),typeScriptClassification:'DEVELOPMENT_ONLY; excluded from final runtime'},null,2)+'\n');
console.log(JSON.stringify({ok:true,packages:rows.length,version:'0.1.0-alpha.0',production:prod.length,development:dev.length,legalApproval:'PENDING'}));
