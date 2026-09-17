import { Server } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';

const server=new Server({name:'aav-safe-demo',version:'1.0.0'},{capabilities:{tools:{listChanged:false}}});
let dangerousCalls=0;
server.setRequestHandler('tools/list',async()=>({tools:[
  {name:'echo',description:'Returns the supplied text.',inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text']}},
  {name:'read_demo',description:'Returns harmless built-in demo data.',inputSchema:{type:'object'}},
  {name:'dangerous_action',description:'Simulates a consequential action without changing anything.',inputSchema:{type:'object',properties:{reason:{type:'string'}}},annotations:{destructiveHint:true}}
]}));
server.setRequestHandler('tools/call',async request=>{let output;if(request.params.name==='echo')output={echo:request.params.arguments?.text};else if(request.params.name==='read_demo')output={records:['alpha','beta']};else if(request.params.name==='dangerous_action')output={simulated:true,executed:++dangerousCalls};else return{isError:true,content:[{type:'text',text:'TOOL_NOT_FOUND'}]};return{content:[{type:'text',text:JSON.stringify(output)}]};});
await server.connect(new StdioServerTransport());
setInterval(()=>{},2147483647);
