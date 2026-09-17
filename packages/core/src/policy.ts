import type { JsonValue, PolicyDecision } from '@agentactionverifier/protocol/audit';

export type PortablePolicy = { id: string; name: string; enabled?: boolean; priority: number; decision: string; toolKey?: string | null; agentId?: string | null; method?: string | null; requiredTags: string[]; createdAt: Date | string };
export type PolicySubject = { agentId: string; tags: string[] };
export type PolicyTool = { key: string; method: string };
export type PolicyExplanation = { id: string; name: string; priority: number; matched: boolean; reasonCodes: string[]; decision: string };
export type PolicyEvaluation = { decision: PolicyDecision; matchedPolicy: PortablePolicy | null; reason: string; metadata: { policiesEvaluated: PolicyExplanation[]; matchingPolicies: PolicyExplanation[]; selectedPolicy: PolicyExplanation | null; defaultDecisionUsed: boolean } };

const decisions: PolicyDecision[] = ['ALLOW', 'DENY', 'REQUIRE_APPROVAL'];
export function orderPolicies<T extends Pick<PortablePolicy, 'priority' | 'createdAt' | 'id'>>(policies: readonly T[]): T[] {
  return [...policies].sort((a, b) => b.priority - a.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id));
}
export function evaluatePolicy(input: { subject: PolicySubject; tool: PolicyTool; input?: JsonValue; context?: JsonValue; policies: readonly PortablePolicy[]; defaultDecision: PolicyDecision }): PolicyEvaluation {
  const explanations: PolicyExplanation[] = [];
  for (const policy of orderPolicies(input.policies)) {
    if (policy.enabled === false) continue;
    const reasonCodes: string[] = [];
    if (policy.toolKey && policy.toolKey !== input.tool.key) reasonCodes.push('POLICY_TOOL_MISMATCH');
    if (policy.agentId && policy.agentId !== input.subject.agentId) reasonCodes.push('POLICY_AGENT_MISMATCH');
    if (policy.method && policy.method.toUpperCase() !== input.tool.method.toUpperCase()) reasonCodes.push('POLICY_METHOD_MISMATCH');
    if (!policy.requiredTags.every((tag) => input.subject.tags.includes(tag))) reasonCodes.push('POLICY_TAG_MISMATCH');
    const explanation = { id: policy.id, name: policy.name, priority: policy.priority, matched: reasonCodes.length === 0, reasonCodes: reasonCodes.length ? reasonCodes : ['POLICY_MATCHED'], decision: policy.decision };
    explanations.push(explanation);
    if (reasonCodes.length) continue;
    const metadata = { policiesEvaluated: explanations, matchingPolicies: [explanation], selectedPolicy: explanation, defaultDecisionUsed: false };
    if (!decisions.includes(policy.decision as PolicyDecision)) return { decision: 'DENY', matchedPolicy: policy, reason: 'INVALID_POLICY_DECISION', metadata };
    return { decision: policy.decision as PolicyDecision, matchedPolicy: policy, reason: `Matched policy: ${policy.name}`, metadata };
  }
  return { decision: input.defaultDecision, matchedPolicy: null, reason: `No matching policy; organization default ${input.defaultDecision.toLowerCase()}`, metadata: { policiesEvaluated: explanations, matchingPolicies: [], selectedPolicy: null, defaultDecisionUsed: true } };
}
