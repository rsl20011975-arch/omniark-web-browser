import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const stamp=Date.now();
Object.assign(process.env,{WORKBENCH_NATIVE:'1',WORKBENCH_PORT:'19376',WORKBENCH_DATA:`data/recovery-${stamp}`,
  WORKBENCH_ARTIFACTS:`artifacts/recovery-${stamp}`,WORKBENCH_NATIVE_DIR:`data/recovery-extension-${stamp}`});
const {config,root}=await import('../../src/config/index.ts');
const seed=spawnSync(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),path.join(root,'tests/system/recovery-seed.ts')],{env:process.env,encoding:'utf8',windowsHide:true});
assert.equal(seed.status,0,seed.stderr);
const first=path.join(config.artifacts,'first.md'),before=fs.statSync(first).mtimeMs;
const server=await import('../../src/server/index.ts');await server.ready;
const browser=await chromium.launch({executablePath:config.chrome,headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(`http://127.0.0.1:${config.port}`);
  await page.getByRole('button',{name:'이 작업 이어가기'}).waitFor();
  await page.screenshot({path:path.join(root,'evidence/r2/recovery-pending.png'),fullPage:true});
  if(process.env.WORKBENCH_TEST_SCOPE==='appearance') {
    await page.setViewportSize({width:360,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(root,'evidence/r2/recovery-narrow.png'),fullPage:true});
    console.log('RECOVERY UI PASS: narrow viewport, no horizontal overflow');
  }else {
  await page.getByRole('button',{name:'이 작업 이어가기'}).click();
  await page.waitForFunction(()=>!document.body.innerText.includes('중단 요청')&&document.body.innerText.includes('second.md'),{},{timeout:180000});
  assert.equal(fs.readFileSync(first,'utf8'),'FIRST');assert.equal(fs.statSync(first).mtimeMs,before);
  assert.equal(fs.readFileSync(path.join(config.artifacts,'second.md'),'utf8').trim(),'SECOND');
  assert.equal(fs.readdirSync(path.join(config.artifacts,'.versions')).length,0);
  await page.screenshot({path:path.join(root,'evidence/r2/recovery-completed.png'),fullPage:true});
  fs.writeFileSync(path.join(root,'evidence/r2/recovery.json'),JSON.stringify({status:'PASS',separateSeedProcess:true,
    boundary:'save-before-receipt',actualCodex:true,firstFileNotRewritten:true,secondFileVerified:true},null,2));
  console.log('RECOVERY PASS: separate process -> actual chat resume -> no duplicate first write');
  }
}finally{await browser.close();await server.closeTestServer();}
