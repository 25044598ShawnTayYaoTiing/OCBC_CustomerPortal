import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/customer-actions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {customerActions,requestNextStep}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const task=(ruleKey)=>({id:ruleKey,ruleKey,instruction:'Original instruction',documentIds:[]});
const detail={submission:{requestType:'RESIDENTIAL_ADDRESS_CHANGE'},documents:[],corrections:[task('ATTACH_SUPPORTING_DOCUMENT'),task('SERVICE_SUPPORT'),task('SERVICE_DETAILS')]};
test('one missing PDF produces one upload action while preserving a separate detail correction',()=>{
 const actions=customerActions(detail);assert.equal(actions.length,2);assert.match(actions[0].instruction,/one PDF.*residential/);assert.equal(detail.corrections.length,3);
});
test('existing supporting evidence retains its mismatch correction',()=>{
 const actions=customerActions({...detail,documents:[{type:'SUPPORTING_DOCUMENT'}],corrections:[task('SERVICE_SUPPORT')]});assert.equal(actions.length,1);assert.match(actions[0].instruction,/replacement PDF/);
});
test('Operations is described as processing rather than completed',()=>{
 assert.match(requestNextStep('OPERATIONS',0),/sent for processing/);assert.doesNotMatch(requestNextStep('OPERATIONS',0),/completed/i);
});
