import type {Artifact,Event,Message,Observation} from '../contracts/index.ts';
import type {PendingApproval} from './approval.tsx';
export type State={active:string|null;history:Message[];events:Event[];artifacts:Artifact[];browser:Observation|null;artifactRoot:string;
  queue?:{id:string;message:string}[];queuePaused?:boolean;conversations?:{id:string;title:string}[];native?:boolean;approval?:PendingApproval|null;research?:boolean;documents?:{name:string;bytes:number}[]};
const token=document.querySelector<HTMLMetaElement>('meta[name="workbench-token"]')!.content;
export const apiBase=document.querySelector<HTMLMetaElement>('meta[name="workbench-base"]')?.content??'';
const headers={'x-workbench-token':token,'Content-Type':'application/json',
  ...(location.protocol==='chrome-extension:'?{'x-workbench-extension':location.host}:{})};
export const conversation=localStorage.getItem('conversation')??crypto.randomUUID();
localStorage.setItem('conversation',conversation);
export async function api<T>(path:string,payload?:unknown):Promise<T> {
  const response=await fetch(apiBase+'/api/'+path,{method:payload?'POST':'GET',headers,body:payload?JSON.stringify(payload):undefined});
  const result=await response.json();if(!response.ok) throw Error(result.error);return result as T;
}
export async function screenshot():Promise<string|null> {
  const result=await fetch(apiBase+'/api/screenshot',{headers});
  return result.ok?URL.createObjectURL(await result.blob()):null;
}
