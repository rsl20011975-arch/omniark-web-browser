import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {config,root} from '../../src/config/index.ts';
const browser=await chromium.launch({executablePath:config.chrome,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080}});
try {
  await page.goto(`http://127.0.0.1:${config.port}/`);
  for(const name of ['dummy.pdf','projects.docx','projects.xlsx']) {
    await page.locator('input[type=file]').setInputFiles(path.join(root,'data/document-fixtures',name));
    await page.locator('.document-input').getByText(new RegExp(name.replace('.','\\.'))).waitFor();
  }
  await page.getByRole('textbox',{name:'작업 지시'}).fill('projects.docx와 projects.xlsx를 실제로 읽어 프로젝트 10개와 수량이 일치하는지 비교해 문서비교.csv로 저장해줘. 열은 Project,DOCX,XLSX,Match로 하고 Match는 같으면 YES로 써줘. dummy.pdf도 읽어 실제 본문을 PDF요약.md에 저장해줘.');
  await page.getByRole('button',{name:'실행',exact:true}).click();
  await page.getByRole('button',{name:'중단 요청'}).waitFor();
  const started=Date.now();
  while(await page.getByRole('button',{name:'중단 요청'}).count()) {
    if(Date.now()-started>600000)throw Error('Document chat timeout');await page.waitForTimeout(1000);
  }
  const csv=fs.readFileSync(path.join(config.artifacts,'문서비교.csv'),'utf8');
  assert.equal(csv.trim().split(/\r?\n/).length,11);
  for(let i=1;i<=10;i++)assert.ok(csv.includes(`Project ${i},${i*3},${i*3},YES`));
  const summary=fs.readFileSync(path.join(config.artifacts,'PDF요약.md'),'utf8');assert.match(summary,/Dummy PDF file/);
  await page.getByRole('textbox',{name:'작업 지시'}).fill('이 초안을 유지해줘');await page.reload();
  assert.equal(await page.getByRole('textbox',{name:'작업 지시'}).inputValue(),'이 초안을 유지해줘');
  await page.getByRole('textbox',{name:'대화 검색'}).fill('projects.docx');await page.getByRole('button',{name:'검색',exact:true}).click();
  await page.locator('.search-hit').first().waitFor();
  await page.screenshot({path:path.join(root,'evidence/r2/document-chat.png'),fullPage:true});
  fs.writeFileSync(path.join(root,'evidence/r2/document-chat.json'),JSON.stringify({status:'PASS',
    actualModel:true,formats:['pdf','docx','xlsx'],comparisonRows:10,allMatch:true,draftReload:true,conversationSearch:true},null,2));
  console.log('DOCUMENT CHAT PASS: upload 3 formats -> actual extraction -> verified comparison/summary; draft/search');
}finally{await browser.close();}
