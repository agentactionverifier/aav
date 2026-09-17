import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';

const cli=process.env.AAV_CLI??fileURLToPath(new URL('../../packages/cli/dist/bin.js',import.meta.url));
const transport=new StdioClientTransport({command:process.execPath,args:[cli,'start'],env:process.env,stderr:'inherit'});
const client=new Client({name:'aav-demo-client',version:'1.0.0'},{capabilities:{}});
await client.connect(transport);
const tools=await client.listTools();
const echo=await client.callTool({name:'demo:echo',arguments:{text:'protected hello'}});
const dangerous=await client.callTool({name:'demo:dangerous_action',arguments:{reason:'demonstrate enforcement'}});
console.log(JSON.stringify({tools:tools.tools.map(x=>x.name),echo,dangerous},null,2));
await client.close();
