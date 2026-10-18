import {api} from './api.ts';
export type PendingApproval={id:string;action:{kind:string;target:string;explanation:string}};
export function ApprovalPanel({pending,onError}:{pending:PendingApproval|null|undefined;onError:(message:string)=>void}) {
  if(!pending)return null;
  const answer=(approved:boolean)=>void api('approval',{id:pending.id,approved}).catch(error=>onError(String(error)));
  return <section className="approval"><strong>실행 전 확인이 필요합니다</strong><p>{pending.action.explanation}</p>
    <p>{pending.action.kind} · {pending.action.target}</p><div><button onClick={()=>answer(false)}>거부</button><button className="primary" onClick={()=>answer(true)}>이 동작 승인</button></div></section>;
}
