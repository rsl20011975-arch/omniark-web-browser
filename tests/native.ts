import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {config,root} from '../src/config/index.ts';
import {NativeTarget} from './native-target.ts';
const extension=config.nativeDirectory;
await fetch(`http://127.0.0.1:${config.port}/`);
export const context=await chromium.launchPersistentContext(path.join(root,'profiles/r2-qa-'+Date.now()),{
  executablePath:config.chrome,headless:false,viewport:{width:1440,height:1000},
  args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],
});
const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
worker.on('console',message=>console.log('EXT:',message.text()));
const id=new URL(worker.url()).host;console.log('Extension loaded',id);
const welcome=await context.newPage();await welcome.goto(`chrome-extension://${id}/welcome.html`);
await welcome.getByRole('button',{name:'채팅 패널 열기'}).click();
await welcome.waitForFunction(async()=>{
  const api=(globalThis as unknown as {chrome:{storage:{session:{get:(key:string)=>Promise<Record<string,unknown>>}}}}).chrome;
  return (await api.storage.session.get('panelOpened')).panelOpened;
},{},{timeout:15000});
console.log('Native side panel opened');
const inspector=await context.newCDPSession(welcome);
console.log('Targets',(await inspector.send('Target.getTargets')).targetInfos.map(target=>({type:target.type,url:target.url,id:target.targetId})));
const panelInfo=(await inspector.send('Target.getTargets')).targetInfos.find(target=>target.url.endsWith('/panel.html'));
assert.ok(panelInfo,'Native panel target exists');
const attached=await inspector.send('Target.attachToTarget',{targetId:panelInfo.targetId,flatten:false});
const panel=new NativeTarget(inspector,attached.sessionId);
await panel.send('Page.enable');
await new Promise(resolve=>setTimeout(resolve,1500));
assert.equal(await panel.evaluate(`document.title.includes('Local Workbench')`),true);
const instruction=`http://127.0.0.1:${config.port}/fixture 를 열고 목록 보기 버튼을 눌러 표의 10행을 네이티브.csv로 저장해줘.`;
await panel.evaluate(`(()=>{const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(instruction)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
await new Promise(resolve=>setTimeout(resolve,300));
await panel.evaluate(`document.querySelector('button.primary').click()`);
const started=Date.now();
await new Promise(resolve=>setTimeout(resolve,1500));
const followup='방금 만든 네이티브.csv의 기존 10행과 수량을 유지하고 검토 열을 추가해 모든 행을 완료로 표시해줘.';
await panel.evaluate(`(()=>{const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(followup)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
await new Promise(resolve=>setTimeout(resolve,300));
await panel.evaluate(`document.querySelector('button.primary').click()`);
while(await panel.evaluate(`Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='중단 요청')`)) {
  if(Date.now()-started>600000)throw Error('Native task timeout');
  await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.ok(!String(await panel.evaluate(`document.querySelector('.messages').innerText`)).includes('작업을 완료하지 못했습니다'));
const content=fs.readFileSync(path.join(config.artifacts,'네이티브.csv'),'utf8');
assert.equal(content.trim().split(/\r?\n/).length,11);
assert.equal((content.match(/완료/g)??[]).length,10);
const provenance=JSON.parse(fs.readFileSync(path.join(config.artifacts,'.sources/네이티브.csv.json'),'utf8'));
assert.ok(provenance.sources.some((source:{url:string})=>source.url.includes('/fixture')));
const actual=context.pages().find(page=>page.url().includes('/fixture'));assert.ok(actual);
assert.equal(await actual.locator('tbody tr').count(),10);
await actual.screenshot({path:path.join(root,'evidence/r2/actual-tab.png')});
const screen=await panel.send('Page.captureScreenshot',{format:'png'}) as {data:string};
fs.writeFileSync(path.join(root,'evidence/r2/native-panel.png'),Buffer.from(screen.data,'base64'));
const fullPage=context.waitForEvent('page');
await panel.evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='전체 대화').click()`,true);
const full=await fullPage;await full.waitForLoadState('domcontentloaded');
await full.getByRole('textbox',{name:'작업 지시'}).waitFor();
assert.ok((await full.locator('.messages').innerText()).includes('검토 열'));
assert.equal(await full.locator('.browser-panel').count(),0);
await full.getByRole('textbox',{name:'작업 지시'}).fill('공유 초안');
await new Promise(resolve=>setTimeout(resolve,400));
assert.equal(await panel.evaluate(`document.querySelector('textarea').value`),'공유 초안');
await full.screenshot({path:path.join(root,'evidence/r2/native-full-chat.png'),fullPage:true});
fs.writeFileSync(path.join(root,'evidence/r2/native.json'),JSON.stringify({status:'PASS',panelOpened:true,
  realTab:actual.url(),rows:10,queuedFollowup:true,provenance:true,fullChatSameConversation:true,sharedDraft:true,content,extensionId:id},null,2));
console.log('NATIVE PASS: actual side panel -> actual visible tab -> CSV');
if(process.env.WORKBENCH_KEEP_BROWSER!=='1')await context.close();
