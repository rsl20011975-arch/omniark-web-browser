import {randomUUID} from 'node:crypto';
import {Store} from '../../src/engine/store.ts';
import {FileStore} from '../../src/files/index.ts';
import {config} from '../../src/config/index.ts';
const store=new Store(config.data),files=new FileStore(config.artifacts),id=randomUUID(),conversation=randomUUID();
const message='먼저 first.md에 FIRST만 저장하고, 다음 second.md에 SECOND만 저장해줘. 이미 완료된 파일은 다시 쓰지 마.';
store.run(id,conversation);store.request(id,conversation,message);store.message(conversation,'user',message);
store.event(id,'started',{message,provider:'codex'});
store.event(id,'planned',{kind:'save',target:'first.md',value:'FIRST',expectedHash:'',observationId:'',explanation:'first step'});
files.save('first.md','FIRST','');
// End this test-owned process at the save-before-receipt boundary. No other process is terminated.
store.db.close();
