import fs from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {config} from '../config/index.ts';
const connectionSchema=z.strictObject({origin:z.string().url(),token:z.string().min(32)});
export async function invoke(tool:unknown) {
  const connection=connectionSchema.parse(JSON.parse(fs.readFileSync(path.join(config.nativeDirectory,'connection.json'),'utf8')));
  if(new URL(connection.origin).hostname!=='127.0.0.1')throw Error('Only local Workbench supported');
  const response=await fetch(connection.origin+'/api/tool',{method:'POST',
    headers:{'x-workbench-token':connection.token,'Content-Type':'application/json',Origin:connection.origin},
    body:JSON.stringify(tool),signal:AbortSignal.timeout(120000)});
  const result=await response.json();if(!response.ok)throw Error(result.error);return result;
}
