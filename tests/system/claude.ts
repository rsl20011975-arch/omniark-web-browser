import {chromium} from 'playwright';
import path from 'node:path';
const stamp=Date.now();
Object.assign(process.env,{WORKBENCH_NATIVE:'1',WORKBENCH_PORT:'19376',WORKBENCH_DATA:`data/claude-${stamp}`,
  WORKBENCH_ARTIFACTS:`artifacts/claude-${stamp}`,WORKBENCH_NATIVE_DIR:`data/claude-extension-${stamp}`});
const {config,root}=await import('../../src/config/index.ts');
const server=await import('../../src/server/index.ts');await server.ready;
const context=await chromium.launchPersistentContext(path.join(root,`profiles/r2-qa-claude-${stamp}`),{
  executablePath:config.chrome,headless:false,args:[`--disable-extensions-except=${config.nativeDirectory}`,`--load-extension=${config.nativeDirectory}`]});
try {
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
  const page=await context.newPage();await page.goto(`chrome-extension://${new URL(worker.url()).host}/welcome.html`);
  await page.getByRole('button',{name:'채팅 패널 열기'}).click();
  await new Promise(resolve=>setTimeout(resolve,2000));
  if(process.env.WORKBENCH_TEST_SCOPE!=='providers')await import('../external-claude.ts');
  const ui=await context.newPage();await ui.goto(`http://127.0.0.1:${config.port}`);
  await ui.locator('.browser-empty').waitFor();
  if(process.env.WORKBENCH_TEST_SCOPE==='providers')await (await import('../providers.ts')).providerWorkflow(ui);
  await ui.screenshot({path:path.join(root,'evidence/r2/native-status.png'),fullPage:true});
}catch(error){console.error('TEST FAILURE:',error);throw error;}
finally{await context.close();await server.closeTestServer();}
