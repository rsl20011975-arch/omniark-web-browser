import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {NativeBridge} from '../src/native/index.ts';
test('another live profile cannot take queued browser actions or invalidate owner',()=>{
  const bridge=new NativeBridge(),first=randomUUID(),second=randomUUID();
  assert.equal(bridge.next(first),null);
  assert.throws(()=>bridge.next(second),/Another browser/);
  assert.throws(()=>bridge.invalidate(second),/Wrong browser/);
  assert.throws(()=>bridge.complete({},second),/Wrong browser/);
  assert.equal(bridge.owner,first);
});
