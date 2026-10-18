import {randomUUID} from 'node:crypto';
import type {Provider} from '../contracts/index.ts';
export type Task={id:string;conversationId:string;message:string;provider:Provider};
export class TaskQueue {
  tasks:Task[]=[];revision=0;paused=false;
  add(conversationId:string,message:string,provider:Provider='codex'):Task {
    const task={id:randomUUID(),conversationId,message,provider};this.tasks.push(task);return task;
  }
  take(){return this.paused?undefined:this.tasks.shift();}
  steer(){this.revision++;}
}
