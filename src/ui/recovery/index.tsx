import {api,type State} from '../api.ts';
export function RecoveryPanel({state,onError}:{state:State|null;onError:(error:string)=>void}) {
  if(!state?.interrupted?.length)return null;
  async function resume(id:string,conversationId:string) {
    try{await api('recover',{id});localStorage.setItem('conversation',conversationId);location.reload();}
    catch(error){onError(String(error));}
  }
  return <section className="approval recovery"><strong>재시작 전에 끊긴 작업</strong>
    <p>완료한 파일을 대조한 뒤 이어갑니다. 결과가 불확실한 화면 조작은 재실행하지 않습니다.</p>
    {state.interrupted.map(task=><div key={task.id}><p>{task.message}</p>
      <button disabled={!!state.active} onClick={()=>void resume(task.id,task.conversationId)}>이 작업 이어가기</button></div>)}
  </section>;
}
