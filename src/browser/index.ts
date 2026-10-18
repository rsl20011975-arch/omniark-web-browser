import {chromium,type BrowserContext,type Page} from 'playwright';
import {randomUUID} from 'node:crypto';
import {config} from '../config/index.ts';
import type {Action,Observation} from '../contracts/index.ts';
export class BrowserBridge {
  context?:BrowserContext; page?:Page; observation?:Observation; screenshot?:Buffer;
  async start() {
    if(this.page) return;
    this.context=await chromium.launchPersistentContext(config.profile,{
      executablePath:config.chrome,headless:config.headless,viewport:{width:1280,height:850},
    });
    this.page=this.context.pages()[0]??await this.context.newPage();
    this.page.setDefaultTimeout(config.pageTimeout);
    this.page.on('framenavigated',frame=>{if(frame===this.page?.mainFrame()) this.observation=undefined;});
  }
  async observe():Promise<Observation> {
    await this.start(); const page=this.page!;
    const snapshot=await page.evaluate((maxText)=>{
      const controls=Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"]'))
        .filter(el=>el.getBoundingClientRect().width>0 && el.getBoundingClientRect().height>0)
        .filter(el=>!(el instanceof HTMLInputElement && el.type==='password'))
        .slice(0,100).map((el,index)=>{
          const ref=String(index); el.setAttribute('data-workbench-ref',ref);
          return {ref,tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||el.getAttribute('placeholder')||'').trim().slice(0,160)};
        });
      const text=document.body?.innerText??'';
      return {title:document.title,text:text.slice(0,maxText),controls,truncated:text.length>maxText};
    },config.maxText);
    this.screenshot=await page.screenshot({type:'jpeg',quality:75});
    this.observation={id:randomUUID(),url:page.url(),...snapshot};
    return this.observation;
  }
  async act(action:Action) {
    await this.start(); const page=this.page!;
    if(action.kind==='navigate') {
      const url=new URL(action.target);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password) throw Error('Only ordinary HTTP(S) pages supported');
      if(url.hostname==='127.0.0.1'&&url.port===String(config.port)&&url.pathname!=='/fixture')
        throw Error('Workbench control surface cannot be an agent target');
      await page.goto(url.href,{waitUntil:'domcontentloaded'});
    } else if(action.kind!=='observe') {
      if(action.observationId!==this.observation?.id) throw Error('Stale browser observation');
      if(!this.observation.controls.some(c=>c.ref===action.target)) throw Error('Unknown browser control');
      const locator=page.locator(`[data-workbench-ref="${action.target}"]`);
      if(action.kind==='click') await locator.click();
      else if(action.kind==='fill') await locator.fill(action.value);
    }
    return this.observe();
  }
  async close() {await this.context?.close();}
}
