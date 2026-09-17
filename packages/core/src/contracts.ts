import type { AuditEvent, JsonValue, PolicyDecision } from '@agentactionverifier/protocol/audit';
export interface Clock{now():Date}
export interface IdGenerator{generate():string}
export interface ToolExecutor{execute(toolKey:string,input:JsonValue):Promise<JsonValue>}
export interface CredentialProvider{get(credentialId:string):Promise<unknown>}
export interface PolicyProvider<T>{list():Promise<readonly T[]>;defaultDecision():Promise<PolicyDecision>}
export interface PolicyStore<T> extends PolicyProvider<T>{}
export interface ApprovalProvider<T>{get(id:string):Promise<T|null>}
export interface ApprovalStore<T>{get(id:string):Promise<T|null>;compareAndSet(id:string,expected:string,next:string):Promise<boolean>}
export interface AuditStore{append(runId:string,event:Omit<AuditEvent,'runId'|'seq'|'timestamp'>):Promise<void>}
export interface IdempotencyStore<T>{get(key:string,fingerprint:string):Promise<T|null>;put(key:string,fingerprint:string,value:T):Promise<void>}
export interface ExecutionAdmissionPolicy{admit(input:{toolKey:string}):Promise<{allowed:true}|{allowed:false;reason:string}>}
