import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execute } from './protected-flow.mjs';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=mkdtempSync(join(tmpdir(),'aav-candidate-clean-')),packs=join(root,'packs'),app=join(root,'app');mkdirSync(packs);mkdirSync(app);
// No inherited hosted-service variables, NODE_PATH, auth tokens or npm secrets.
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|HOME|USERPROFILE|SYSTEMROOT|WINDIR|TEMP|TMP|PATHEXT|COMSPEC)$/i.test(key)));
env.NPM_CONFIG_USERCONFIG=process.platform==='win32'?'NUL':'/dev/null';
for(const name of ['protocol','core','verifier','gateway','storage-sqlite','mcp','cli'])await execute(process.platform==='win32'?'pnpm.cmd':'pnpm',['--filter',`@agentactionverifier/${name}`,'pack','--pack-destination',packs],{cwd:repo,env});
writeFileSync(join(app,'package.json'),JSON.stringify({name:'aav-clean-room',private:true,type:'module'})+'\n');
await execute(process.platform==='win32'?'npm.cmd':'npm',['install',...readdirSync(packs).map(x=>join(packs,x))],{cwd:app,env});
cpSync(join(repo,'scripts','protected-flow.mjs'),join(app,'protected-flow.mjs'));cpSync(join(repo,'scripts','clean-room-flow.mjs'),join(app,'flow.mjs'));
const result=await execute(process.execPath,['flow.mjs'],{cwd:app,env});
const data=JSON.parse(result.stdout);mkdirSync(join(repo,'certification'),{recursive:true});writeFileSync(join(repo,'certification','clean-room.json'),JSON.stringify({...data,root,installedOnlyFromCandidateTarballs:true,cloudEnvironmentRequired:false},null,2)+'\n');console.log(result.stdout);
