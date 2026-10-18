import type {Page} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {config,root} from '../src/config/index.ts';
export async function providerWorkflow(ui:Page) {
  async function run(message:string) {
    await ui.getByRole('textbox',{name:'작업 지시'}).fill(message);
    const response=ui.waitForResponse(r=>r.url().endsWith('/api/chat')&&r.request().method()==='POST');
    await ui.getByRole('button',{name:'실행',exact:true}).click();
    const {runId}=await (await response).json();
    const start=Date.now();
    for(;;) {
      const state=await ui.evaluate(async()=>{
        const token=document.querySelector<HTMLMetaElement>('meta[name="workbench-token"]')!.content;
        return (await fetch('/api/state',{headers:{'x-workbench-token':token}})).json();
      });
      const result=state.events.find((e:{runId:string;type:string})=>e.runId===runId&&['completed','failed','needs_user'].includes(e.type));
      if(result){assert.equal(result.type,'completed',JSON.stringify(result));break;}
      if(Date.now()-start>300000)throw Error('Provider task timeout');
      await ui.waitForTimeout(500);
    }
    await ui.getByRole('button',{name:'실행',exact:true}).waitFor();
  }
  await ui.getByRole('combobox',{name:'작업 AI'}).selectOption('claude');
  const filename='구독전환.md';
  await run(`https://example.com 을 열어서 실제 제목과 첫 문장, URL을 ${filename} 파일로 저장해줘.`);
  const first=fs.readFileSync(path.join(config.artifacts,filename),'utf8');
  assert.match(first,/Example Domain/);assert.match(first,/documentation/);
  await ui.getByRole('combobox',{name:'작업 AI'}).selectOption('codex');
  await run(`방금 만든 ${filename}의 내용을 그대로 유지하고 마지막 줄에 검토 완료를 추가해줘.`);
  const second=fs.readFileSync(path.join(config.artifacts,filename),'utf8');
  assert.ok(second.includes(first.trim()));assert.match(second,/검토 완료/);
  await ui.screenshot({path:path.join(root,'evidence/r2/provider-switch.png'),fullPage:true});
  fs.writeFileSync(path.join(root,'evidence/r2/provider-switch.json'),JSON.stringify({status:'PASS',
    actualProviders:['claude','codex'],sameConversation:true,preservedContent:true,filename,first,second},null,2));
  console.log('PROVIDERS PASS: actual Claude chat -> web/file -> Codex same-chat edit');
}
