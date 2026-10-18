export function inspect(maxText) {
  const id=crypto.randomUUID();document.documentElement.dataset.workbenchObservation=id;
  const controls=Array.from(document.querySelectorAll('a,button,input,textarea,select,[role="button"]'))
    .filter(el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0)
    .filter(el=>!(el instanceof HTMLInputElement&&el.type==='password'))
    .slice(0,100).map((el,index)=>{
      const ref=String(index);el.setAttribute('data-workbench-ref',ref);
      return {ref,tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||el.getAttribute('placeholder')||'').trim().slice(0,160)};
    });
  const text=document.body?.innerText??'';
  return {id,url:location.href,title:document.title,text:text.slice(0,maxText),controls,truncated:text.length>maxText};
}
export function manipulate(action) {
  if(document.documentElement.dataset.workbenchObservation!==action.observationId)throw Error('Stale page observation');
  if(!/^\d+$/.test(action.target))throw Error('Invalid control reference');
  const element=document.querySelector(`[data-workbench-ref="${action.target}"]`);
  if(!element||!element.getBoundingClientRect().width)throw Error('Control no longer visible');
  if(element instanceof HTMLInputElement&&element.type==='password')throw Error('Manual authentication required');
  if(action.kind==='click')element.click();
  else {
    const proto=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;
    if(!setter)throw Error('Element does not accept text');setter.call(element,action.value);
    element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));
  }
}
