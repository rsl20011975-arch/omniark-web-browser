import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Action,Observation} from '../contracts/index.ts';
export const ruleSchema=z.array(z.strictObject({tool:z.string(),host:z.string(),decision:z.enum(['allow','ask','deny'])}));
export type Rule=z.infer<typeof ruleSchema>[number];
export function decision(action:Action,observation:Observation|undefined,rules:Rule[]) {
  const url=action.kind==='navigate'?action.target:observation?.url;
  const host=url?new URL(url).hostname:'';
  const matching=rules.filter(rule=>(rule.tool==='*'||rule.tool===action.kind)&&(rule.host==='*'||rule.host===host));
  if(matching.some(rule=>rule.decision==='deny'))return 'deny';
  if(matching.some(rule=>rule.decision==='ask'))return 'ask';
  if(action.kind==='click') {
    const label=observation?.controls.find(control=>control.ref===action.target)?.label??'';
    if(/결제|발행|전송|삭제|구매|송금|purchase|pay now|send|publish|delete/i.test(label))return 'ask';
  }
  return 'allow';
}
export class Approval {
  pending:{id:string;action:Action}|null=null;
  private resolve:((approved:boolean)=>void)|null=null;
  request(action:Action) {
    this.pending={id:randomUUID(),action};
    return new Promise<boolean>(resolve=>{this.resolve=resolve;});
  }
  answer(id:string,approved:boolean) {
    if(this.pending?.id!==id||!this.resolve)throw Error('Approval is expired or does not match');
    this.resolve(approved);this.resolve=null;this.pending=null;
  }
  cancel(){if(this.pending)this.answer(this.pending.id,false);}
}
