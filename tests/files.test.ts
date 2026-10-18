import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FileStore} from '../src/files/index.ts';
import {Store} from '../src/engine/store.ts';
test('real writes retain original and reject stale modification or path escape',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-files-'));
  const store=new FileStore(directory);
  const first=store.save('자료.csv','번호,수량\n1,3\n','');
  assert.equal(fs.readFileSync(first.absolutePath,'utf8'),'번호,수량\n1,3\n');
  assert.throws(()=>store.save('자료.csv','bad',''),/changed/);
  assert.throws(()=>store.save('../escape.md','bad',''),/plain/);
  assert.throws(()=>store.save('empty.md',' ','') ,/Empty/);
  const second=store.save('자료.csv','번호,수량,검토\n1,3,완료\n',first.hash);
  assert.equal(second.previousHash,first.hash);
  assert.equal(fs.readFileSync(path.join(directory,'.versions',first.hash+'.txt'),'utf8'),first.content);
});
test('conversation and run history survive database reopen; active run is not replayed',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'workbench-db-'));
  const first=new Store(directory);first.message('test','user','첫 지시');first.run('r1','test');first.db.close();
  const second=new Store(directory);
  assert.equal(second.history('test')[0].content,'첫 지시');
  assert.equal(second.db.prepare('SELECT status FROM runs WHERE id=?').get('r1')?.status,'interrupted');
  second.db.close();
});
