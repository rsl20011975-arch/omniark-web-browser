import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Action,Observation} from '../contracts/index.ts';
const observed=z.object({id:z.string(),url:z.string(),title:z.string(),text:z.string(),
  controls:z.array(z.object({ref:z.string(),tag:z.string(),label:z.string()})),truncated:z.boolean()});
export class NativeBridge {
  observation?:Observation;screenshot?:Buffer;connectedAt=0;
  private pending:{id:string;action:Action}[]=[];
  private waiting=new Map<string,{resolve:(o:Observation)=>void;reject:(error:Error)=>void;timer:NodeJS.Timeout}>();
  next() {this.connectedAt=Date.now();return this.pending.shift()??null;}
  invalidate() {this.observation=undefined;}
  complete(input:unknown) {
    const result=z.strictObject({id:z.string().uuid(),result:observed.optional(),error:z.string().optional()}).parse(input);
    const waiter=this.waiting.get(result.id);if(!waiter)throw Error('Unknown or expired operation');
    this.waiting.delete(result.id);clearTimeout(waiter.timer);
    if(result.error) {waiter.reject(Error(result.error));return;}
    if(!result.result){waiter.reject(Error('No browser observation returned'));return;}
    this.observation=result.result;waiter.resolve(result.result);
  }
  async act(action:Action):Promise<Observation> {
    if(Date.now()-this.connectedAt>15000)throw Error('브라우저 패널 연결이 없습니다. 전용 브라우저를 열어주세요.');
    const id=randomUUID();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.waiting.delete(id);this.pending=this.pending.filter(item=>item.id!==id);
        reject(Error('Native browser operation timed out; do not automatically repeat submission'));},45000);
      this.waiting.set(id,{resolve,reject,timer});this.pending.push({id,action});
    });
  }
  async observe() {
    return this.act({kind:'observe',target:'',value:'',expectedHash:'',observationId:'',explanation:''});
  }
}
