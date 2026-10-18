import {z} from 'zod';
import {actionSchema,type Action} from '../contracts/index.ts';
import type {FileStore} from '../files/index.ts';
import type {BrowserBridge} from '../browser/index.ts';
import type {NativeBridge} from '../native/index.ts';
export const toolSchema=z.strictObject({tool:z.enum(['browser','files_list','file_read','file_write']),
  action:actionSchema.optional(),name:z.string().optional(),value:z.string().optional(),expectedHash:z.string().optional()});
export async function executeAction(action:Action,files:FileStore,browser:BrowserBridge|NativeBridge) {
  return action.kind==='save'?files.save(action.target,action.value,action.expectedHash):browser.act(action);
}
export function fileAction(input:z.infer<typeof toolSchema>):Action {
  if(input.name===undefined||input.value===undefined||input.expectedHash===undefined)throw Error('Name, value and expectedHash are required');
  return {kind:'save',target:input.name,value:input.value,expectedHash:input.expectedHash,observationId:'',explanation:'외부 클라이언트 파일 저장'};
}
