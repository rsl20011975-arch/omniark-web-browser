import {config} from '../config/index.ts';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {decide} from '../agents/index.ts';
import {BrowserBridge} from '../browser/index.ts';
import {NativeBridge} from '../native/index.ts';
import {FileStore} from '../files/index.ts';
import {Store} from './store.ts';
import {TaskQueue} from './queue.ts';
import {Approval,decision,ruleSchema} from '../permissions/index.ts';
import {toolSchema,executeAction,fileAction} from './tools.ts';
import {actionSchema} from '../contracts/index.ts';
import type {Observation,Provider} from '../contracts/index.ts';
import {ResearchStore,type DocumentEvidence} from '../research/index.ts';
import {completion} from './completion.ts';
import {Documents} from '../documents/index.ts';
import {reconcile} from './recovery.ts';
export class Engine {
  store=new Store(config.data); files=new FileStore(config.artifacts);
  browser=config.native?new NativeBridge():new BrowserBridge();
  active:string|null=null; stopped=false;
  activeConversation:string|null=null;queue=new TaskQueue();
  activeProvider:Provider='codex';
  approval=new Approval();externalBusy=false;
  research=new ResearchStore(config.artifacts);
  documents=new Documents(config.data);
  constructor() {}
  submit(conversationId:string,message:string,mode:'queue'|'steer'='queue',provider:Provider='codex') {
    if(this.externalBusy)throw Error('외부 AI가 브라우저 도구를 사용 중입니다.');
    if(this.active&&mode==='steer') {
      if(this.activeConversation!==conversationId)throw Error('Only the active conversation can be steered');
      this.activeProvider=provider;this.store.message(conversationId,'user',message);this.queue.steer();
      this.store.event(this.active,'steered',{message,provider});return this.active;
    }
    const task=this.queue.add(conversationId,message,provider);
    this.store.run(task.id,conversationId);this.store.status(task.id,'queued');
    this.store.request(task.id,conversationId,message);this.store.event(task.id,'queued',{message,provider});
    if(!this.active)this.startNext();return task.id;
  }
  private startNext() {
    const task=this.queue.take();if(!task)return;
    this.active=task.id;this.activeConversation=task.conversationId;this.activeProvider=task.provider;this.stopped=false;
    this.store.status(task.id,'running');this.store.message(task.conversationId,'user',task.message);
    this.store.event(task.id,'started',{message:task.message,provider:task.provider});void this.execute(task.id,task.conversationId);
  }
  async execute(id:string,conversationId:string,previousReceipts:unknown[]=[]) {
    const receipts:unknown[]=[...previousReceipts];
    const observations:Observation[]=[];
    const documentEvidence:DocumentEvidence[]=[];
    try {
      for(let step=0;step<config.steps;step++) {
        if(this.stopped) throw Error('사용자가 작업을 중단했습니다. 완료된 변경은 유지됩니다.');
        this.store.event(id,'thinking',{step});
        const revision=this.queue.revision;
        const action=await decide({history:this.store.history(conversationId),
          browser:this.browser.observation??null,files:this.files.list(),documents:this.documents.list(),receipts},this.activeProvider);
        if(this.stopped) throw Error('사용자가 작업을 중단했습니다.');
        if(revision!==this.queue.revision){this.store.event(id,'replanning',{});continue;}
        this.store.event(id,'action',{kind:action.kind,target:action.target,explanation:action.explanation});
        const outcome=completion(action,receipts);
        if(outcome) {
          this.store.message(conversationId,'assistant',action.value);
          this.store.status(id,outcome);this.store.event(id,outcome,{message:action.value});
          if(outcome==='needs_user')this.queue.paused=true;return;
        }
        await this.authorize(action,id);
        if(this.stopped)throw Error('사용자가 작업을 중단했습니다.');
        if(revision!==this.queue.revision){this.store.event(id,'replanning',{});continue;}
        this.store.event(id,'planned',action);
        const result=action.kind==='read_document'?await this.documents.read(action.target)
          :await executeAction(action,this.files,this.browser);
        if('url' in result)observations.push(result);
        if('units' in result)documentEvidence.push(result);
        if(action.kind==='save'&&(observations.length||documentEvidence.length))this.research.record(action.target,observations,id,documentEvidence);
        receipts.push({action:action.kind,result});
        this.store.event(id,'result',{kind:action.kind,result});
      }
      throw Error('실행 단계 한도에 도달했습니다. 작업 기록에서 마지막 결과를 확인하세요.');
    } catch(error) {
      this.queue.paused=true;
      const message=error instanceof Error?error.message:String(error);
      this.store.status(id,'failed');this.store.event(id,'failed',{message});
      this.store.message(conversationId,'assistant','작업을 완료하지 못했습니다. '+message);
    } finally {this.active=null;this.activeConversation=null;this.startNext();}
  }
  state(conversationId:string) {
    return {active:this.active,history:this.store.history(conversationId),events:this.store.events(),
      artifacts:this.files.list(),browser:this.browser.observation??null,artifactRoot:config.artifacts,
      queue:this.queue.tasks,queuePaused:this.queue.paused,interrupted:this.store.interrupted(),conversations:this.store.conversations(),native:config.native,approval:this.approval.pending,research:true,documents:this.documents.list()};
  }
  recover(id:string) {
    if(this.active||this.externalBusy)throw Error('진행 중인 작업이 끝난 뒤 재개하세요.');
    const task=reconcile(this.store,this.files,id);
    this.active=id;this.activeConversation=task.conversationId;this.activeProvider=task.provider;this.stopped=false;
    this.store.status(id,'running');this.store.event(id,'resumed',{receipts:task.receipts.length});
    if(!task.alreadyStarted)this.store.message(task.conversationId,'user',task.message);
    void this.execute(id,task.conversationId,task.receipts);return id;
  }
  resumeQueue(){this.queue.paused=false;if(!this.active)this.startNext();}
  async authorize(action:import('../contracts/index.ts').Action,id:string) {
    const file=path.join(config.data,'permissions.json');
    const rules=fs.existsSync(file)?ruleSchema.parse(JSON.parse(fs.readFileSync(file,'utf8'))):[];
    const result=decision(action,this.browser.observation,rules);
    this.store.event(id,'permission',{kind:action.kind,decision:result});
    if(result==='deny')throw Error('작업별 권한 규칙에서 거부된 동작입니다.');
    if(result==='ask') {
      this.store.status(id,'waiting_approval');
      const approved=await this.approval.request(action);
      this.store.event(id,'approval',{approved});this.store.status(id,'running');
      if(!approved)throw Error('사용자가 동작을 승인하지 않았습니다.');
    }
  }
  async external(input:unknown) {
    const request=toolSchema.parse(input),id=randomUUID();
    if(request.tool==='files_list')return this.files.list();
    if(request.tool==='file_read')return this.files.read(request.name??'');
    if(this.active||this.externalBusy)throw Error('Another execution owner holds the browser/file lease');
    this.externalBusy=true;
    try {
      const action=request.tool==='file_write'?fileAction(request):actionSchema.parse(request.action);
      await this.authorize(action,id);
      const result=await executeAction(action,this.files,this.browser);
      this.store.event(id,'external_result',{tool:request.tool,result});return result;
    }finally{this.externalBusy=false;}
  }
}
