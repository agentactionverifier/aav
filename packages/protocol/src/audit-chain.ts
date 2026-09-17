import { createHash } from 'node:crypto';
import type { AuditEvent } from './audit.js';
import { canonicalJsonStringify } from './canonical-json.js';
export const AUDIT_CHAIN_VERSION = 'aav-audit-chain-v1' as const;
export const AUDIT_HASH_ALGORITHM = 'SHA-256' as const;
export const AUDIT_CHAIN_GENESIS = '0'.repeat(64);
export function sha256Hex(input: string): string { return createHash('sha256').update(input).digest('hex'); }
export function auditEventPayload(event: AuditEvent) { return { id:event.id, runId:event.runId, seq:event.seq, type:event.type, at:event.at, data:event.data ?? null }; }
export function computeAuditEventHash(event: AuditEvent): string { return sha256Hex(canonicalJsonStringify(auditEventPayload(event))); }
export function computeAuditChainHash(previousChainHash: string, eventHash: string): string { return sha256Hex(previousChainHash + eventHash); }
