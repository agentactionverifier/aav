export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ISODateTime = string;
export type HashHex = string;
export type RunId = string;
export type Locale = 'es' | 'en';
export type PolicyDecision = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
export type ProtocolErrorCode = 'UNKNOWN' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'POLICY_DENIED' | 'APPROVAL_REQUIRED' | 'APPROVAL_INVALID' | 'APPROVAL_EXPIRED' | 'TOOL_CREDENTIAL_UNAVAILABLE';
export type ErrorCode = ProtocolErrorCode;
export type MessageKey = string;
export type ApiError = { code: ProtocolErrorCode; messageKey: MessageKey; params?: Record<string, string | number | boolean | null> };
export type ApiErrorResponse = { error: ApiError };
export type StartRunResponse = { runId: RunId; tenantId: string; agentId: string; startedAt: ISODateTime };
export type AuthorizationContext = { tenantId: string; agentId: string; runId: RunId; toolKey: string; method: string; url: string; tags: string[]; input: JsonValue; executionGrantId?: string };
export type AuthorizationResult = { decision: PolicyDecision; reason: string; policyId?: string; policyName?: string };
export type AuditEventType = 'RUN_STARTED' | 'TOOL_REQUESTED' | 'INPUT_VALIDATED' | 'INPUT_REJECTED' | 'POLICY_EVALUATED' | 'RISK_EVALUATED' | 'EXECUTION_GRANT_EVALUATED' | 'EXECUTION_GRANT_CONSUMED' | 'EXECUTION_GRANT_REJECTED' | 'APPROVAL_REQUESTED' | 'APPROVAL_APPROVED' | 'APPROVAL_REJECTED' | 'APPROVAL_CONSUMED' | 'APPROVAL_EXPIRED' | 'TOOL_EXECUTED' | 'TOOL_CREDENTIAL_ACCESSED' | 'TOOL_CREDENTIAL_ROTATED' | 'RUN_FINISHED' | 'ERROR';
export type AuditEvent = { id: string; runId: RunId; seq: number; type: AuditEventType; at: ISODateTime; data?: JsonValue; eventHash?: HashHex; prevChainHash?: HashHex; chainHash?: HashHex };
/** Compact unsigned v1 evidence anchor. issuedAt is metadata and is not cryptographically bound. */
export type Receipt = { runId: RunId; eventCount: number; finalChainHash: HashHex; issuedAt: ISODateTime };
