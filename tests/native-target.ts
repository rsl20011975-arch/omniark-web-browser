import type {CDPSession} from 'playwright';
export class NativeTarget {
  contextId?:number;
  sequence=0;
  pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void}>();
  constructor(readonly transport:CDPSession,readonly sessionId:string) {
    transport.on('Target.receivedMessageFromTarget',(event)=>{
      if(event.sessionId!==sessionId)return;
      const response=JSON.parse(event.message);const receiver=this.pending.get(response.id);
      if(!receiver)return;this.pending.delete(response.id);
      if(response.error)receiver.reject(Error(JSON.stringify(response.error)));
      else receiver.resolve(response.result);
    });
  }
  async send(method:string,params:Record<string,unknown>={}):Promise<unknown> {
    const id=++this.sequence;
    const result=new Promise((resolve,reject)=>this.pending.set(id,{resolve,reject}));
    await this.transport.send('Target.sendMessageToTarget',{sessionId:this.sessionId,message:JSON.stringify({id,method,params})});
    return result;
  }
  async evaluate(expression:string) {
    const response=await this.send('Runtime.evaluate',{expression,contextId:this.contextId,awaitPromise:true,returnByValue:true}) as
      {result:{value:unknown};exceptionDetails?:unknown};
    if(response.exceptionDetails)throw Error(JSON.stringify(response.exceptionDetails));return response.result.value;
  }
}
