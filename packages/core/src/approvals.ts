import { createHash } from 'node:crypto';
import type { AuthorizationContext } from '@agentactionverifier/protocol/audit';
import { canonicalJsonStringify } from '@agentactionverifier/protocol/canonical-json';
export type ApprovalStatus='PENDING'|'APPROVED'|'REJECTED'|'CONSUMED'|'EXPIRED';
const transitions:Record<ApprovalStatus,readonly ApprovalStatus[]>={PENDING:['APPROVED','REJECTED','EXPIRED'],APPROVED:['CONSUMED','EXPIRED'],REJECTED:[],CONSUMED:[],EXPIRED:[]};
export function canTransition(from:string,to:ApprovalStatus){return from in transitions&&transitions[from as ApprovalStatus].includes(to);}
export function applyApprovalDecision(from:ApprovalStatus,decision:'APPROVE'|'REJECT'):ApprovalStatus|null{const to=decision==='APPROVE'?'APPROVED':'REJECTED';return canTransition(from,to)?to:null;}
export function isApprovalExpired(expiresAt:Date|string,now:Date){return new Date(expiresAt).getTime()<=now.getTime();}
export function isApprovalUsable(status:ApprovalStatus,expiresAt:Date|string,now:Date){return status==='APPROVED'&&!isApprovalExpired(expiresAt,now);}
export function approvalContextHash(context:AuthorizationContext,policyId?:string){return createHash('sha256').update(canonicalJsonStringify({...context,policyId:policyId??null})).digest('hex');}
export function matchesApprovalContext(approval:{tenantId:string;runId:string;agentId:string;toolKey:string;contextHash:string;policyId:string|null},expected:AuthorizationContext,policyId?:string){return approval.tenantId===expected.tenantId&&approval.runId===expected.runId&&approval.agentId===expected.agentId&&approval.toolKey===expected.toolKey&&approval.contextHash===approvalContextHash(expected,policyId)&&approval.policyId===(policyId??null);}
