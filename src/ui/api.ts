import type {Artifact,Event,Message,Observation} from '../contracts/index.ts';
export type State={active:string|null;history:Message[];events:Event[];artifacts:Artifact[];browser:Observation|null;artifactRoot:string};
const token=document.querySelector<HTMLMetaElement>('meta[name="workbench-token"]')!.content;
export const conversation=localStorage.getItem('conversation')??crypto.randomUUID();
localStorage.setItem('conversation',conversation);
export async function api<T>(path:string,payload?:unknown):Promise<T> {
  const response=await fetch('/api/'+path,{method:payload?'POST':'GET',headers:{'x-workbench-token':token,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});
  const result=await response.json();if(!response.ok) throw Error(result.error);return result as T;
}
export async function screenshot():Promise<string|null> {
  const result=await fetch('/api/screenshot',{headers:{'x-workbench-token':token}});
  return result.ok?URL.createObjectURL(await result.blob()):null;
}
