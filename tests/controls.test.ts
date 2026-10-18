import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TaskQueue} from '../src/engine/queue.ts';
import {Approval,decision} from '../src/permissions/index.ts';
import {actionSchema,type Action} from '../src/contracts/index.ts';
const action:Action={kind:'navigate',target:'https://example.com',value:'',expectedHash:'',observationId:'',explanation:'test'};
test('Deny dominates allow and ask; exact host matching',()=>{
  assert.equal(decision(action,undefined,[{tool:'*',host:'*',decision:'allow'},
    {tool:'navigate',host:'example.com',decision:'deny'}]),'deny');
  assert.equal(decision(action,undefined,[{tool:'*',host:'example.com.evil.test',decision:'deny'}]),'allow');
  assert.equal(decision(action,undefined,[{tool:'navigate',host:'example.com',decision:'ask'}]),'ask');
});
test('Approval requires exact pending request and cannot be reused',async()=>{
  const gate=new Approval(),pending=gate.request(action),id=gate.pending!.id;
  assert.throws(()=>gate.answer('wrong',true),/expired/);
  gate.answer(id,false);assert.equal(await pending,false);
  assert.throws(()=>gate.answer(id,true),/expired/);
});
test('Queue FIFO does not mix requests; steer invalidates earlier plan revision',()=>{
  const queue=new TaskQueue();const first=queue.add('a','first'),second=queue.add('b','second');
  const revision=queue.revision;queue.steer();assert.notEqual(queue.revision,revision);
  assert.deepEqual(queue.take(),first);assert.deepEqual(queue.take(),second);assert.equal(queue.take(),undefined);
});
test('Unknown model tool and unexpected fields rejected at boundary',()=>{
  assert.equal(actionSchema.safeParse({...action,kind:'shell'}).success,false);
  assert.equal(actionSchema.safeParse({...action,command:'something'}).success,false);
});
