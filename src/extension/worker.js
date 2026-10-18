import {inspect,manipulate} from './dom.js';
let selected=null,connection=null;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function call(route,body) {
  const response=await fetch(connection.origin+'/bridge/'+route,{method:body?'POST':'GET',
    headers:{'x-workbench-token':connection.token,'x-workbench-extension':chrome.runtime.id,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!response.ok)throw Error(`Bridge ${response.status}: ${await response.text()}`);return response.json();
}
async function current() {
  if(selected!==null){try{return await chrome.tabs.get(selected);}catch(error){console.warn('Selected tab closed',error);selected=null;}}
  const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});
  if(!tab)throw Error('No active browser tab');return tab;
}
async function ready(tabId) {
  for(let attempt=0;attempt<100;attempt++) {
    const tab=await chrome.tabs.get(tabId);if(tab.status==='complete')return;
    await delay(200);
  }
  throw Error('Page load timeout');
}
async function perform(action) {
  let tab=await current();
  if(action.kind==='navigate') {
    const url=new URL(action.target);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Unsupported navigation');
    if(url.origin===connection.origin&&url.pathname!=='/fixture')throw Error('Agent cannot target its control surface');
    tab=/^https?:/.test(tab.url??'')?await chrome.tabs.update(tab.id,{url:url.href}):await chrome.tabs.create({url:url.href});
    selected=tab.id;await ready(tab.id);tab=await chrome.tabs.get(tab.id);
  }else if(action.kind!=='observe') {
    await chrome.scripting.executeScript({target:{tabId:tab.id},func:manipulate,args:[action]});
    await ready(tab.id);tab=await chrome.tabs.get(tab.id);
  }
  if(!/^https?:/.test(tab.url??''))throw Error('Open an ordinary web page to attach it');
  selected=tab.id;
  const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:inspect,args:[24000]});
  if(!result?.result)throw Error('No readable page');return result.result;
}
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);
chrome.sidePanel.onOpened.addListener(info=>{void chrome.storage.session.set({panelOpened:info});});
chrome.commands.onCommand.addListener(async command=>{
  if(command==='open-chat'){const tab=await current();await chrome.sidePanel.open({windowId:tab.windowId});}
});
chrome.tabs.onActivated.addListener(({tabId})=>{selected=tabId;if(connection)void call('invalidate',{}).catch(console.error);});
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(tabId===selected&&change.status==='loading'&&connection)void call('invalidate',{}).catch(console.error);});
async function poll() {
  for(;;) {
    try {
      connection=await (await fetch(chrome.runtime.getURL('connection.json'),{cache:'no-store'})).json();
      await chrome.runtime.getPlatformInfo();
      const command=await call('next');
      if(command) {
        let result;
        try{result={id:command.id,result:await perform(command.action)};}
        catch(error){result={id:command.id,error:String(error)};}
        await call('result',result);
      }
    }catch(error){console.error('Workbench bridge:',error);}
    await delay(700);
  }
}
void poll();
