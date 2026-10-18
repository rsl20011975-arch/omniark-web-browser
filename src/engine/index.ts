import {randomUUID} from 'node:crypto';
import {config} from '../config/index.ts';
import {decide} from '../agents/index.ts';
import {BrowserBridge} from '../browser/index.ts';
import {FileStore} from '../files/index.ts';
import {Store} from './store.ts';
export class Engine {
  store=new Store(config.data); files=new FileStore(config.artifacts); browser=new BrowserBridge();
  active:string|null=null; stopped=false;
  constructor() {}
  submit(conversationId:string,message:string) {
    if(this.active) throw Error('A task is already running');
    const id=randomUUID(); this.active=id; this.stopped=false;
    this.store.message(conversationId,'user',message);this.store.run(id,conversationId);
    this.store.event(id,'started',{message});
    void this.execute(id,conversationId);
    return id;
  }
  async execute(id:string,conversationId:string) {
    const receipts:unknown[]=[];
    try {
      for(let step=0;step<config.steps;step++) {
        if(this.stopped) throw Error('사용자가 작업을 중단했습니다. 완료된 변경은 유지됩니다.');
        this.store.event(id,'thinking',{step});
        const action=await decide({history:this.store.history(conversationId),
          browser:this.browser.observation??null,files:this.files.list(),receipts});
        if(this.stopped) throw Error('사용자가 작업을 중단했습니다.');
        this.store.event(id,'action',{kind:action.kind,target:action.target,explanation:action.explanation});
        if(action.kind==='finish') {
          this.store.message(conversationId,'assistant',action.value);
          this.store.status(id,'completed');this.store.event(id,'completed',{message:action.value});return;
        }
        const result=action.kind==='save'?this.files.save(action.target,action.value,action.expectedHash)
          :await this.browser.act(action);
        receipts.push({action:action.kind,result});
        this.store.event(id,'result',{kind:action.kind,result});
      }
      throw Error('실행 단계 한도에 도달했습니다. 작업 기록에서 마지막 결과를 확인하세요.');
    } catch(error) {
      const message=error instanceof Error?error.message:String(error);
      this.store.status(id,'failed');this.store.event(id,'failed',{message});
      this.store.message(conversationId,'assistant','작업을 완료하지 못했습니다. '+message);
    } finally {this.active=null;}
  }
  state(conversationId:string) {
    return {active:this.active,history:this.store.history(conversationId),events:this.store.events(),
      artifacts:this.files.list(),browser:this.browser.observation??null,artifactRoot:config.artifacts};
  }
}
