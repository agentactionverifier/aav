import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePolicy, orderPolicies } from '../dist/policy.js';
import { evaluateRisk } from '../dist/risk.js';
import { evaluateConstraints, evaluateGrant } from '../dist/grants.js';
import { approvalContextHash, canTransition, isApprovalExpired, isApprovalUsable, matchesApprovalContext } from '../dist/approvals.js';
import { REDACTED, redactSecrets } from '../dist/credentials.js';
import { executionRequestFingerprint } from '../dist/idempotency.js';
import { validateToolInput } from '../dist/validation.js';

const policy=(overrides={})=>({id:'p1',name:'Policy',enabled:true,priority:1,decision:'ALLOW',requiredTags:[],createdAt:'2026-01-01T00:00:00Z',...overrides});
const policyInput={subject:{agentId:'a1',tags:['PAYMENT']},tool:{key:'send',method:'POST'},input:{amount:1},policies:[],defaultDecision:'DENY'};
test('policy decisions, explicit default, precedence and determinism',()=>{
  for(const decision of ['ALLOW','DENY','REQUIRE_APPROVAL']) assert.equal(evaluatePolicy({...policyInput,policies:[policy({decision})]}).decision,decision);
  assert.equal(evaluatePolicy(policyInput).decision,'DENY');
  const policies=[policy({id:'new',priority:5,createdAt:'2026-02-01',decision:'DENY'}),policy({id:'z',priority:5,decision:'DENY'}),policy({id:'a',priority:5,decision:'REQUIRE_APPROVAL'})];
  assert.deepEqual(orderPolicies(policies).map(x=>x.id),['a','z','new']);
  assert.deepEqual(evaluatePolicy({...policyInput,policies}),evaluatePolicy({...policyInput,policies}));
});
test('risk v1 is deterministic for known scenarios',()=>{const at=new Date('2026-08-18T00:00:00Z'),input={method:'DELETE',tags:['destructive'],url:'https://example.com',policyDecision:'DENY',defaultDecisionUsed:true,grantRequired:true,grantAllowed:false,agentEnabled:false,agentEnvironment:'production'};const result=evaluateRisk(input,at);assert.deepEqual(result,evaluateRisk(input,at));assert.equal(result.score,100);assert.equal(result.riskModelVersion,'v1');});
test('grant constraints match, reject mismatch, bounds and fields',()=>{assert.equal(evaluateConstraints({'customer.id':{equals:'1'},amount:{numericMin:1,numericMax:5},$allowedFields:['customer.id','amount']},{customer:{id:'1'},amount:3}),true);assert.equal(evaluateConstraints({amount:{numericMax:5}},{amount:6}),false);assert.equal(evaluateConstraints({$allowedFields:['amount']},{amount:1,secret:true}),false);});
test('grant evaluation binds context, expiry and constraints',()=>{const grant={id:'g',tenantId:'t',agentId:'a',status:'ACTIVE',allowedToolKeys:['send'],constraints:{amount:{numericMax:5}},expiresAt:'2027-01-01',maxExecutions:1,executionCount:0},base={grantMode:'REQUIRED',executionGrantId:'g',tenantId:'t',agentId:'a',toolKey:'send',toolTenantId:'t',payload:{amount:2},grant,now:new Date('2026-01-01')};assert.equal(evaluateGrant(base).allowed,true);assert.equal(evaluateGrant({...base,agentId:'other'}).allowed,false);assert.deepEqual(evaluateGrant({...base,now:new Date('2028-01-01')}),{allowed:false,reason:'GRANT_EXPIRED',grantId:'g'});assert.equal(evaluateGrant({...base,payload:{amount:9}}).allowed,false);});
test('approval transitions, expiry, context binding and replay state',()=>{assert.equal(canTransition('PENDING','APPROVED'),true);assert.equal(canTransition('APPROVED','CONSUMED'),true);assert.equal(canTransition('CONSUMED','APPROVED'),false);assert.equal(canTransition('PENDING','EXPIRED'),true);assert.equal(canTransition('APPROVED','EXPIRED'),true);const now=new Date('2026-01-02');assert.equal(isApprovalExpired('2026-01-01',now),true);assert.equal(isApprovalUsable('CONSUMED','2027-01-01',now),false);const context={tenantId:'t',agentId:'a',runId:'r',toolKey:'send',method:'POST',url:'https://example.com',tags:[],input:{x:1}};const approval={tenantId:'t',agentId:'a',runId:'r',toolKey:'send',policyId:null,contextHash:approvalContextHash(context)};assert.equal(matchesApprovalContext(approval,context),true);assert.equal(matchesApprovalContext(approval,{...context,input:{x:2}}),false);});
test('redaction handles auth, API keys, tokens and nested fields',()=>{assert.deepEqual(redactSecrets({authorization:'Bearer x',nested:{apiKey:'x',token:'x',safe:'ok'}}),{authorization:REDACTED,nested:{apiKey:REDACTED,token:REDACTED,safe:'ok'}});});
test('idempotency is stable by key order and changes with input',()=>{const a=executionRequestFingerprint({toolKey:'send',payload:{a:1,b:2}}),b=executionRequestFingerprint({toolKey:'send',payload:{b:2,a:1}}),c=executionRequestFingerprint({toolKey:'send',payload:{a:2,b:2}});assert.equal(a,b);assert.notEqual(a,c);});
test('portable input validation returns errors without HTTP exceptions',()=>{const schema={type:'object',required:['amount'],additionalProperties:false,properties:{amount:{type:'number',minimum:0}}};assert.deepEqual(validateToolInput(schema,{amount:1}),{valid:true,errors:[]});const invalid=validateToolInput(schema,{amount:-1,secret:true});assert.equal(invalid.valid,false);assert.deepEqual(invalid.errors,['$.amount: below minimum','$.secret: property is not allowed']);});
