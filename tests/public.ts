import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {config,root} from '../src/config/index.ts';
const base=`http://127.0.0.1:${config.port}`;
const browser=await chromium.launch({executablePath:config.chrome,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080}});
try {
  await page.goto(base);
  const unauthorized=await fetch(base+'/api/state');assert.equal(unauthorized.status,401);
  await page.getByRole('textbox',{name:'작업 지시'}).fill('https://example.com 에 접속해서 실제 페이지 제목과 본문 첫 문장을 읽고 출처 URL과 함께 웹조사.md로 저장해줘.');
  await page.getByRole('button',{name:'실행',exact:true}).click();
  await page.getByRole('button',{name:'중단 요청'}).waitFor();
  const started=Date.now();
  while(await page.getByRole('button',{name:'중단 요청'}).count()) {
    if(Date.now()-started>600000)throw Error('Public-page task timeout');
    await page.waitForTimeout(1000);
  }
  const chat=await page.locator('.messages').innerText();
  assert.ok(!chat.includes('작업을 완료하지 못했습니다'),chat);
  const content=fs.readFileSync(path.join(config.artifacts,'웹조사.md'),'utf8');
  assert.match(content,/Example Domain/);assert.match(content,/https:\/\/example.com/);
  assert.match(content,/documentation/i);
  await page.screenshot({path:path.join(root,'evidence/r1/public-page.png'),fullPage:true});
  await page.getByRole('button',{name:'전체 대화',exact:true}).click();
  assert.equal(await page.locator('.browser-panel').count(),0);
  assert.equal(await page.locator('.file-content').count(),1);
  await page.screenshot({path:path.join(root,'evidence/r1/full-chat.png'),fullPage:true});
  fs.writeFileSync(path.join(root,'evidence/r1/public.json'),JSON.stringify({status:'PASS',url:'https://example.com',
    source:'actual external page via owned Chromium',content,unauthenticatedApiStatus:401,fullChat:true},null,2));
  console.log('PUBLIC PASS: actual HTTPS page -> sourced Markdown; full chat and API access check');
} finally {await browser.close();}
