import { createHash } from 'node:crypto';
import type { JsonValue } from '@agentactionverifier/protocol/audit';
import { canonicalJsonStringify } from '@agentactionverifier/protocol/canonical-json';
export const IDEMPOTENCY_CANONICALIZATION_VERSION='v1';
export const IDEMPOTENCY_FINGERPRINT_ALGORITHM='SHA-256';
export function executionRequestFingerprint(input:{toolKey:string;payload?:JsonValue;executionGrantId?:string}){const logicalOperation:JsonValue={method:'POST',operation:'agent.tool.execute',toolKey:input.toolKey,input:input.payload??{},executionGrantId:input.executionGrantId??null};return createHash('sha256').update(canonicalJsonStringify(logicalOperation)).digest('hex');}
