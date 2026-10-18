import {randomUUID} from 'node:crypto';
export type Task={id:string;conversationId:string;message:string};
export class TaskQueue {
  tasks:Task[]=[];revision=0;paused=false;
  add(conversationId:string,message:string):Task {
    const task={id:randomUUID(),conversationId,message};this.tasks.push(task);return task;
  }
  take(){return this.paused?undefined:this.tasks.shift();}
  steer(){this.revision++;}
}
