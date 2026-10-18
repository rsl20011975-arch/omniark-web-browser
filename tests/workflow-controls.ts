import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {config,root} from '../src/config/index.ts';
const connection=JSON.parse(fs.readFileSync(path.join(config.nativeDirectory,'connection.json'),'utf8')) as {origin:string;token:string};
async function api(route:string,input?:unknown) {
  const result=await fetch(connection.origin+'/api/'+route,{method:input?'POST':'GET',
    headers:{'x-workbench-token':connection.token,Origin:connection.origin,'Content-Type':'application/json'},
    body:input?JSON.stringify(input):undefined});
  const body=await result.json();if(!result.ok)throw Error(body.error);return body;
}
async function until(predicate:()=>Promise<boolean>) {
  const start=Date.now();while(!await predicate()) {
    if(Date.now()-start>300000)throw Error('Workflow timeout');await new Promise(resolve=>setTimeout(resolve,500));
  }
}
const conversationId=randomUUID(),name='중간지시-'+Date.now()+'.md';
await api('chat',{conversationId,message:`${name} 파일을 만들고 파일 내용은 OLD 한 단어만 써줘.`});
await api('chat',{conversationId,mode:'steer',message:`앞의 지시를 변경할게. ${name} 파일 내용은 NEW 한 단어만 저장해줘. OLD는 쓰지 마.`});
await until(async()=>!(await api('state?conversation='+conversationId)).active);
assert.equal(fs.readFileSync(path.join(config.artifacts,name),'utf8').trim(),'NEW');
const state=await api('state?conversation='+conversationId);
assert.ok(state.events.some((event:{type:string})=>event.type==='replanning'));
const rulesPath=path.join(config.data,'permissions.json');
assert.equal(fs.existsSync(rulesPath),false,'Test must not replace existing permissions');
fs.writeFileSync(rulesPath,JSON.stringify([{tool:'save',host:'*',decision:'ask'}]));
const approvedName='승인검증-'+Date.now()+'.md';
try {
  const pending=api('tool',{tool:'file_write',name:approvedName,value:'approved',expectedHash:''});
  await until(async()=>!!(await api('state')).approval);
  assert.equal(fs.existsSync(path.join(config.artifacts,approvedName)),false);
  const approval=(await api('state')).approval;
  await api('approval',{id:approval.id,approved:true});await pending;
  assert.equal(fs.readFileSync(path.join(config.artifacts,approvedName),'utf8'),'approved');
  fs.writeFileSync(path.join(root,'evidence/r2/workflow-controls.json'),JSON.stringify({status:'PASS',
    realModelSteer:true,obsoletePlanDiscarded:true,approvalBeforeWrite:true,files:[name,approvedName]},null,2));
  console.log('CONTROLS PASS: real model steer discards obsolete plan; approval gates actual write');
}finally{fs.unlinkSync(rulesPath);}
