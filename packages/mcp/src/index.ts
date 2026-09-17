import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/client/stdio';
import { Server, type Transport } from '@modelcontextprotocol/server';
import type { JsonValue } from '@agentactionverifier/protocol/audit';
import type { LocalAAV } from '@agentactionverifier/gateway';

export type MCPStdioUpstream={
  id:string;
  name:string;
  transport:'stdio';
  command:string;
  args?:string[];
  cwd?:string;
  credentialRef?:string;
  credentialEnv?:string;
  enabled?:boolean;
};
export type MCPUpstream=MCPStdioUpstream;
export type MCPMetadataLimits={maxTools:number;maxNameLength:number;maxDescriptionLength:number;maxSchemaBytes:number;maxSchemaDepth:number};
export interface MCPRegistryStore{
  putMCPUpstream?(value:{id:string;projectId:string;name:string;transport:string;config:JsonValue;enabled:boolean}):void;
  mcpUpstreams?(projectId:string):Array<{id:string;projectId:string;name:string;transport:string;config:JsonValue;enabled:boolean}>;
  putMCPToolMapping?(value:{projectId:string;toolKey:string;upstreamId:string;upstreamTool:string;metadata:JsonValue}):void;
  mcpToolMappings?(projectId:string):Array<{projectId:string;toolKey:string;upstreamId:string;upstreamTool:string;metadata:JsonValue}>;
}
export type AAVMCPProxyConfig={
  projectId:string;
  runtime:LocalAAV;
  stores?:MCPRegistryStore;
  upstreams?:MCPUpstream[];
  limits?:Partial<MCPMetadataLimits>;
  logger?:(event:Record<string,unknown>)=>void;
};

type SafeTool={name:string;description?:string;inputSchema:Record<string,unknown>;annotations?:Record<string,boolean>};
type Mapping={toolKey:string;upstreamId:string;upstreamTool:string;tool:SafeTool};
const DEFAULT_LIMITS:MCPMetadataLimits={maxTools:256,maxNameLength:128,maxDescriptionLength:4096,maxSchemaBytes:65536,maxSchemaDepth:20};
const SAFE_ERROR:Record<string,string>={NOT_FOUND:'TOOL_NOT_FOUND',TOOL_INPUT_INVALID:'INPUT_INVALID',POLICY_DENIED:'POLICY_DENIED',APPROVAL_REQUIRED:'APPROVAL_REQUIRED',APPROVAL_REJECTED:'APPROVAL_REJECTED',APPROVAL_EXPIRED:'APPROVAL_EXPIRED',TOOL_CREDENTIAL_UNAVAILABLE:'CREDENTIAL_UNAVAILABLE',DOWNSTREAM_FAILED:'UPSTREAM_PROTOCOL_ERROR'};
const json=(v:unknown)=>v as JsonValue;
function depth(value:unknown,seen=new Set<object>()):number{if(!value||typeof value!=='object')return 0;if(seen.has(value as object))throw new Error('MCP_METADATA_INVALID');seen.add(value as object);const values=Array.isArray(value)?value:Object.values(value);const result=1+Math.max(0,...values.map(v=>depth(v,seen)));seen.delete(value as object);return result;}
function safeId(value:string){if(!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value))throw new Error('MCP_UPSTREAM_INVALID');return value;}
function sanitizeTool(raw:any,limits:MCPMetadataLimits):SafeTool{
  if(!raw||typeof raw.name!=='string'||raw.name.length<1||raw.name.length>limits.maxNameLength||!/^[-A-Za-z0-9_.:]+$/.test(raw.name))throw new Error('MCP_METADATA_INVALID');
  if(raw.description!==undefined&&(typeof raw.description!=='string'||raw.description.length>limits.maxDescriptionLength))throw new Error('MCP_METADATA_INVALID');
  const schema=raw.inputSchema??{type:'object'};let encoded:string;try{encoded=JSON.stringify(schema);}catch{throw new Error('MCP_METADATA_INVALID');}
  if(!schema||typeof schema!=='object'||Array.isArray(schema)||encoded.length>limits.maxSchemaBytes||depth(schema)>limits.maxSchemaDepth)throw new Error('MCP_METADATA_INVALID');
  const annotations:Record<string,boolean>={};for(const key of ['readOnlyHint','destructiveHint','idempotentHint','openWorldHint'])if(typeof raw.annotations?.[key]==='boolean')annotations[key]=raw.annotations[key];
  return{name:raw.name,...(raw.description?{description:raw.description}:{}),inputSchema:schema,...(Object.keys(annotations).length?{annotations}:{})};
}
function responseError(code:string,details:Record<string,unknown>={}){return{isError:true,content:[{type:'text' as const,text:JSON.stringify({error:{code,...details}})}]};}

class UpstreamConnection{
  client?:Client; transport?:StdioClientTransport; credentialConnected=false;
  constructor(readonly config:MCPUpstream){}
  async connect(credential?:string){await this.close();const env={...getDefaultEnvironment()};if(credential&&this.config.credentialEnv)env[this.config.credentialEnv]=credential;this.transport=new StdioClientTransport({command:this.config.command,args:this.config.args,cwd:this.config.cwd,env,stderr:'pipe'});this.client=new Client({name:'aav-local-mcp-proxy',version:'0.1.0'},{capabilities:{}});try{await this.client.connect(this.transport);this.credentialConnected=Boolean(credential);}catch{await this.close();throw new Error('UPSTREAM_UNAVAILABLE');}}
  async ensure(credential?:string){if(!this.client||Boolean(credential)!==this.credentialConnected)await this.connect(credential);return this.client!;}
  async close(){const client=this.client;this.client=undefined;this.transport=undefined;this.credentialConnected=false;if(client)await client.close().catch(()=>{});}
}

export class AAVMCPProxy{
  private readonly server:Server;
  private readonly upstreams=new Map<string,UpstreamConnection>();
  private readonly mappings=new Map<string,Mapping>();
  private readonly limits:MCPMetadataLimits;
  constructor(private readonly config:AAVMCPProxyConfig){this.limits={...DEFAULT_LIMITS,...config.limits};this.server=new Server({name:'aav-local-mcp-proxy',version:'0.1.0'},{capabilities:{tools:{listChanged:false}}});this.server.setRequestHandler('tools/list',async()=>({tools:[...this.mappings.values()].map(m=>({name:m.toolKey,description:m.tool.description,inputSchema:m.tool.inputSchema,annotations:m.tool.annotations}))}) as any);this.server.setRequestHandler('tools/call',async request=>this.call(request.params.name,json(request.params.arguments??{}),typeof request.params._meta?.idempotencyKey==='string'?request.params._meta.idempotencyKey:undefined));const configured=config.upstreams??[],saved=configured.length?[]:(config.stores?.mcpUpstreams?.(config.projectId)??[]).filter(x=>x.enabled).map(row=>{if(!row.config||typeof row.config!=='object'||Array.isArray(row.config))throw new Error('MCP_CONFIG_INVALID');return{id:row.id,name:row.name,...row.config} as MCPUpstream;});for(const upstream of [...configured,...saved])this.registerUpstream(upstream);}
  registerUpstream(upstream:MCPUpstream){safeId(upstream.id);if(this.upstreams.has(upstream.id))throw new Error('MCP_UPSTREAM_DUPLICATE');if(!upstream.command||upstream.command.length>4096||(upstream.args?.length??0)>128)throw new Error('MCP_UPSTREAM_INVALID');this.upstreams.set(upstream.id,new UpstreamConnection(upstream));const stored={transport:'stdio',command:upstream.command,args:upstream.args??[],cwd:upstream.cwd??null,credentialRef:upstream.credentialRef??null,credentialEnv:upstream.credentialEnv??null};this.config.stores?.putMCPUpstream?.({id:upstream.id,projectId:this.config.projectId,name:upstream.name,transport:'stdio',config:json(stored),enabled:upstream.enabled??true});}
  async start(){for(const connection of this.upstreams.values())if(connection.config.enabled!==false)await this.discover(connection);return this;}
  async connect(transport:Transport){await this.server.connect(transport);}
  async stop(){await this.server.close().catch(()=>{});await Promise.all([...this.upstreams.values()].map(u=>u.close()));}
  listMappings(){return [...this.mappings.values()].map(m=>({...m}));}
  private async discover(connection:UpstreamConnection){let result;try{result=await (await connection.ensure()).listTools();}catch{throw new Error('UPSTREAM_UNAVAILABLE');}if(result.tools.length>this.limits.maxTools)throw new Error('MCP_METADATA_INVALID');for(const raw of result.tools){const tool=sanitizeTool(raw,this.limits),toolKey=`${connection.config.id}:${tool.name}`;if(this.mappings.has(toolKey))throw new Error('MCP_TOOL_COLLISION');const mapping={toolKey,upstreamId:connection.config.id,upstreamTool:tool.name,tool};this.mappings.set(toolKey,mapping);this.config.stores?.putMCPToolMapping?.({projectId:this.config.projectId,toolKey,upstreamId:mapping.upstreamId,upstreamTool:mapping.upstreamTool,metadata:json(tool)});this.config.runtime.registerTool({key:toolKey,name:tool.name,method:'MCP',url:`mcp://${connection.config.id}/${encodeURIComponent(tool.name)}`,inputSchema:json(tool.inputSchema),credentialRef:connection.config.credentialRef,tags:['mcp',`mcp:${connection.config.id}`]});this.config.runtime.registerExecutor(toolKey,async({input,credential})=>{const client=await connection.ensure(credential);try{return json(await client.callTool({name:mapping.upstreamTool,arguments:input as Record<string,unknown>}));}catch{throw new Error('UPSTREAM_PROTOCOL_ERROR');}});}}
  private async call(toolKey:string,input:JsonValue,idempotencyKey?:string){if(!this.mappings.has(toolKey))return responseError('TOOL_NOT_FOUND');try{const result=await this.config.runtime.executeTool(toolKey,input,idempotencyKey),body=result.body as any;if(result.status===200)return{content:[{type:'text' as const,text:JSON.stringify(body.output)}],_meta:{aav:{runId:body.runId,receipt:body.receipt}}};const code=SAFE_ERROR[body?.error?.code]??'UPSTREAM_PROTOCOL_ERROR';return responseError(code,{...(body?.error?.runId?{runId:body.error.runId}:{}),...(body?.error?.approvalRequestId?{approvalRequestId:body.error.approvalRequestId}:{})});}catch{return responseError('UPSTREAM_PROTOCOL_ERROR');}}
}

export function createAAVMCPProxy(config:AAVMCPProxyConfig){return new AAVMCPProxy(config);}

export type AAVLocalMCPConfig={project:string;mcp:{upstreams:MCPUpstream[]}};
export function parseAAVLocalMCPConfig(value:unknown):AAVLocalMCPConfig{
  if(!value||typeof value!=='object')throw new Error('MCP_CONFIG_INVALID');const raw=value as any;
  if(typeof raw.project!=='string'||!raw.project||!raw.mcp||!Array.isArray(raw.mcp.upstreams))throw new Error('MCP_CONFIG_INVALID');
  const upstreams=raw.mcp.upstreams.map((item:any)=>{if(!item||typeof item!=='object'||item.transport!=='stdio'||typeof item.id!=='string'||typeof item.name!=='string'||typeof item.command!=='string')throw new Error('MCP_CONFIG_INVALID');safeId(item.id);const allowed=new Set(['id','name','transport','command','args','cwd','credentialRef','credentialEnv','enabled']);for(const key of Object.keys(item))if(!allowed.has(key))throw new Error('MCP_CONFIG_INVALID');if(item.args!==undefined&&(!Array.isArray(item.args)||item.args.some((x:unknown)=>typeof x!=='string')))throw new Error('MCP_CONFIG_INVALID');if(item.credentialRef!==undefined&&typeof item.credentialRef!=='string')throw new Error('MCP_CONFIG_INVALID');if(item.credentialEnv!==undefined&&typeof item.credentialEnv!=='string')throw new Error('MCP_CONFIG_INVALID');return item as MCPUpstream;});
  return{project:raw.project,mcp:{upstreams}};
}
