import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {config,root} from '../src/config/index.ts';
import {hash} from '../src/files/index.ts';
const base=`http://127.0.0.1:${config.port}`;
const out=path.join(root,'evidence','r1');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:config.chrome,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080}});
const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);await page.locator('textarea').waitFor();
async function request(message:string) {
  await page.getByRole('textbox',{name:'작업 지시'}).fill(message);
  await page.getByRole('button',{name:'실행',exact:true}).click();
  await page.getByRole('button',{name:'중단 요청'}).waitFor();
  const started=Date.now();
  while(await page.getByRole('button',{name:'중단 요청'}).count()) {
    if(Date.now()-started>600000) throw Error('Live task exceeded ten minutes');
    await page.waitForTimeout(1000);
  }
  const text=await page.locator('.messages').innerText();
  fs.writeFileSync(path.join(out,'chat.txt'),text);
  assert.ok(!text.includes('작업을 완료하지 못했습니다'),text);
}
try {
  console.log('LIVE 1: Korean chat -> browser navigation/click -> real 10-row CSV');
  await request(`${base}/fixture 에서 목록 보기 버튼을 누르고 실제 표의 번호, 프로젝트, 수량 열과 10개 행을 읽어 검증자료.csv 파일로 저장해줘.`);
  const file=path.join(config.artifacts,'검증자료.csv');
  const original=fs.readFileSync(file,'utf8');const firstHash=hash(original);
  assert.equal(original.trim().split(/\r?\n/).length,11);
  for(let i=1;i<=10;i++) assert.ok(original.includes(`자료 ${String.fromCharCode(64+i)}`));
  console.log('LIVE 1 PASS:',firstHash);
  console.log('LIVE 2: same conversation -> revise existing file, preserve 10 rows');
  await request('방금 만든 검증자료.csv의 기존 10개 행과 수량은 그대로 두고 검토 열을 추가해서 모든 행을 완료로 표시해줘. 같은 파일을 수정해줘.');
  const revised=fs.readFileSync(file,'utf8');
  assert.equal(revised.trim().split(/\r?\n/).length,11);
  assert.equal((revised.match(/완료/g)??[]).length,10);assert.notEqual(hash(revised),firstHash);
  assert.equal(fs.readFileSync(path.join(config.artifacts,'.versions',firstHash+'.txt'),'utf8'),original);
  await page.reload();await page.getByText('검증자료.csv',{exact:true}).waitFor();
  assert.ok((await page.locator('.messages').innerText()).includes('검토 열'));
  const layout=[];
  for(const dark of [false,true]) {
    if(dark)await page.getByRole('button',{name:'테마 전환'}).click();
    for(const width of [320,768,1440]) {
      await page.setViewportSize({width,height:1080});await page.waitForTimeout(250);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      layout.push({dark,width,overflow});assert.equal(overflow,false);
      await page.screenshot({path:path.join(out,`ui-${dark?'dark':'light'}-${width}.png`),fullPage:true});
    }
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify({status:'PASS',provider:'official Codex CLI, real inference',
    browser:'owned Chromium profile, authored fixture',rows:10,originalHash:firstHash,revisedHash:hash(revised),
    revisionsRetained:true,reloadHistory:true,layout,pageErrors:errors,file},null,2));
  console.log('LIVE PASS: real browser + file create/revise + preserved original + six layouts');
} finally {await browser.close();}
