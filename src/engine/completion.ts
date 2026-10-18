import type {Action} from '../contracts/index.ts';
export function completion(action:Action,receipts:unknown[]) {
  if(action.kind==='wait_user')return 'needs_user';
  if(action.kind==='reply')return 'answered';
  if(action.kind!=='finish')return null;
  if(receipts.length===0)throw Error('실제 도구 실행 근거가 없어 완료로 처리하지 않았습니다.');
  return 'completed';
}
