import {actionSchema,type Provider} from '../contracts/index.ts';
import {FileStore,hash} from '../files/index.ts';
import {Store} from './store.ts';
export function reconcile(store:Store,files:FileStore,id:string) {
  const task=store.interrupted().find(row=>row.id===id);
  if(!task)throw Error('재개 가능한 중단 작업이 없습니다.');
  const events=store.runEvents(id);
  const lastResult=events.filter(e=>e.type==='result').at(-1);
  const lastPlan=events.filter(e=>e.type==='planned'||e.type==='action').at(-1);
  if(lastPlan&&lastPlan.id>(lastResult?.id??0)) {
    const pending=lastPlan.payload as {kind:string};
    if(['click','fill'].includes(pending.kind))
      throw Error('화면 조작 결과가 확인되지 않았습니다. 실제 사이트 결과를 확인한 뒤 새 지시를 보내주세요. 자동 재실행하지 않습니다.');
    if(pending.kind==='save') {
      const action=actionSchema.safeParse(lastPlan.payload);
      if(!action.success)throw Error('이전 버전의 저장 기록은 자동 대조할 수 없습니다. 파일을 확인해주세요.');
      const existing=files.list().find(file=>file.name===action.data.target);
      if(existing?.hash===hash(action.data.value)) {
        store.event(id,'result',{kind:'save',result:existing,reconciled:true});
      }else if((existing?.hash??'')!==action.data.expectedHash)
        throw Error('중단 이후 파일이 변경되었습니다. 자동 복구 대신 변경 내용을 확인해주세요.');
    }
  }
  const providerEvent=events.filter(e=>['queued','started','steered'].includes(e.type)).at(-1);
  const candidate=(providerEvent?.payload as {provider?:string})?.provider;
  const provider:Provider=candidate==='claude'?'claude':'codex';
  return {id,conversationId:String(task.conversationId),message:String(task.message),provider,
    alreadyStarted:events.some(e=>e.type==='started'),
    receipts:store.runEvents(id).filter(e=>e.type==='result').map(e=>{
      const payload=e.payload as {kind:string;result:unknown};return {action:payload.kind,result:payload.result};
    })};
}
