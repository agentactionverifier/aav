import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots=['packages/protocol','packages/core','packages/verifier','packages/gateway','packages/storage-sqlite','packages/mcp','packages/cli'];
const forbidden=[/from\s+['"](?:\.\.\/)*apps\//,/from\s+['"]@agent-auditor\/shared/,/from\s+['"]@prisma\//,/from\s+['"](?:stripe|redis|resend|@nestjs\/)/];
const files=[];for(const root of roots){const walk=dir=>{for(const name of readdirSync(dir)){const path=join(dir,name),s=statSync(path);if(s.isDirectory()&&!['dist','node_modules','.turbo'].includes(name))walk(path);else if(s.isFile()&&/\.(?:ts|mts|js|mjs)$/.test(name))files.push(path);}};walk(root);}
const violations=[];for(const file of files){const text=readFileSync(file,'utf8');for(const pattern of forbidden)if(pattern.test(text))violations.push({file,pattern:String(pattern)});}
if(violations.length){console.error(JSON.stringify({ok:false,violations},null,2));process.exit(1);}console.log(JSON.stringify({ok:true,packages:roots,filesScanned:files.length,cloudImports:0}));
