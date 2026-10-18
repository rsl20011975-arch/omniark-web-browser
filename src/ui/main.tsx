import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api,apiBase,conversation,screenshot,type State} from './api.ts';
import {BrowserPanel,FilePanel} from './panels.tsx';
import {copy} from './copy.ts';
import './style.css';
import {ApprovalPanel} from './approval.tsx';
import {Conversations} from './conversations.tsx';
function App() {
  const wholeChat=new URLSearchParams(location.search).get('mode')==='full';
  const nativePanel=(location.protocol==='chrome-extension:'&&!wholeChat)||new URLSearchParams(location.search).get('mode')==='panel';
  const [state,setState]=useState<State|null>(null),[message,setMessage]=useState(()=>localStorage.getItem('draft:'+conversation)??'');
  const [error,setError]=useState(''),[full,setFull]=useState(wholeChat),[dark,setDark]=useState(false);
  const [image,setImage]=useState<string|null>(null),[sending,setSending]=useState(false);
  const [mode,setMode]=useState<'queue'|'steer'>('queue');
  const snapshotId=useRef(''),imageUrl=useRef<string|null>(null),bottom=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    let disposed=false;
    const refresh=async()=>{
      try {const current=await api<State>('state?conversation='+conversation);if(disposed)return;setState(current);
        if(!current.native&&current.browser?.id&&current.browser.id!==snapshotId.current){
          snapshotId.current=current.browser.id;const next=await screenshot();
          if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);imageUrl.current=next;setImage(next);
        }
      }catch(e){if(!disposed)setError(String(e));}
    };
    void refresh();const timer=setInterval(refresh,1000);
    return()=>{disposed=true;clearInterval(timer);if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);};
  },[]);
  useEffect(()=>{const messages=bottom.current?.parentElement;messages?.scrollTo({top:messages.scrollHeight,behavior:'smooth'});},[state?.history.length]);
  useEffect(()=>{localStorage.setItem('draft:'+conversation,message);},[message]);
  useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key==='draft:'+conversation)setMessage(event.newValue??'');};
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
  async function send(event:React.FormEvent) {
    event.preventDefault();setError('');setSending(true);
    try{await api('chat',{conversationId:conversation,message,mode});setMessage('');}
    catch(e){setError(String(e));}finally{setSending(false);}
  }
  const busy=!!state?.active||sending;
  const activity=state?.events.filter(e=>e.runId===state.active).at(-1);
  return <main data-native-panel={nativePanel} data-theme={dark?'dark':'light'}>
    <header><div><strong>{copy.brand}</strong><span className="brand-tag">{copy.tag}</span></div>
      <nav><button onClick={()=>nativePanel?window.open(location.origin+'/panel.html?mode=full','_blank'):setFull(!full)}>{full?copy.split:copy.full}</button><button onClick={()=>setDark(!dark)}>{copy.theme}</button></nav></header>
    <Conversations state={state}/><div className="workspace-title"><div><p className="eyebrow">PERSONAL WORKSPACE</p><h1>{copy.title}</h1><p>{copy.subtitle}</p></div><span className={'status '+(busy?'running':'')}>{busy?copy.busy:copy.ready}</span></div>
    <div className={'workspace '+(full?'full':'')}>
      <div className="work-area">{!full&&!nativePanel&&<BrowserPanel state={state} image={image}/>}<FilePanel state={state}/></div>
      <section className="chat"><div className="pane-heading"><span>{copy.chat}</span><span className="badge">{copy.provider}</span></div>
        <div className="messages">{!state?.history.length&&<div className="welcome"><h2>무엇을 함께 할까요?</h2><p>웹페이지의 표를 파일로 정리하거나,<br/>만든 파일에 열을 추가해 보세요.</p>
          <button onClick={()=>setMessage(`${apiBase||location.origin}/fixture 에서 목록 보기 버튼을 누르고 표의 10개 행을 업무.csv로 저장해줘.`)}>검증용 자료로 시작하기</button></div>}
          {state?.history.map((item,index)=><article key={index} className={'message '+item.role}><span>{item.role==='user'?'나':'Workbench'}</span><div>{item.content}</div></article>)}
          {busy&&<div className="activity"><span className="pulse"/>{activity?.type==='action'?String((activity.payload as {explanation:string}).explanation):'작업을 처리하고 있습니다…'}</div>}<div ref={bottom}/></div>
        {error&&<div className="error" role="alert">{error}</div>}
        <ApprovalPanel pending={state?.approval} onError={setError}/>
        {state?.queuePaused&&<div className="approval">작업 실패 또는 사용자 조치 대기로 대기열이 멈췄습니다.<button onClick={()=>void api('queue/resume',{}).catch(e=>setError(String(e)))}>대기열 재개</button></div>}
        <form onSubmit={send}><textarea aria-label="작업 지시" value={message} onChange={e=>setMessage(e.target.value)} placeholder={copy.placeholder}/>
          {busy&&<div className="composer-footer"><select aria-label="진행 중 지시 방식" value={mode} onChange={e=>setMode(e.target.value as 'queue'|'steer')}><option value="queue">다음 작업으로 대기</option><option value="steer">현재 작업 수정</option></select><button type="button" onClick={()=>void api('stop',{}).catch(e=>setError(String(e)))}>{copy.stop}</button></div>}
          <div className="composer-footer"><small>{state?.queue?.length?`대기 중 ${state.queue.length}개`:'수정 전 버전 보관'}</small><button className="primary" disabled={!message.trim()||sending}>{busy?'지시 보내기':copy.send}</button></div></form>
      </section>
    </div><footer>{state?.native?'Chromium · 전용 채팅 패널':copy.runtime}<span>파일 결과와 실행 기록은 이 PC에 저장됩니다.</span></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
