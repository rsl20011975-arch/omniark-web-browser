import {useState} from 'react';
import type {State} from './api.ts';
import {copy} from './copy.ts';
import {SourcesPanel} from './sources.tsx';
import {DocumentsPanel} from './documents/index.tsx';
export function BrowserPanel({state,image}:{state:State|null;image:string|null}) {
  return <section className="browser-panel"><div className="pane-heading"><span>{copy.browser}</span><span className="badge">전용 세션</span></div>
    <div className="address">{state?.browser?.url??'아직 열린 페이지 없음'}</div>
    {state?.native?<div className="browser-empty"><div className="line-mark"/><h2>브라우저 탭과 연결되어 있습니다</h2><p>{state.browser?.title??'브라우저에서 페이지를 열어주세요.'}</p><p>실제 페이지는 전용 브라우저 탭에서 확인하세요.</p></div>:image?<><img className="browser-image" src={image} alt="실제 Chromium의 마지막 관찰 화면"/><div className="caption">실제 브라우저 · 마지막 도구 실행 시점의 화면</div></>:
      <div className="browser-empty"><div className="line-mark"/><h2>{copy.emptyBrowser}</h2><p>{copy.browserHelp}</p></div>}
  </section>;
}
export function FilePanel({state}:{state:State|null}) {
  const [name,setName]=useState('');const files=state?.artifacts??[];
  const chosen=files.find(f=>f.name===name)??files[0];
  return <section className="files-panel"><div className="pane-heading"><span>{copy.files}</span><span className="badge">{files.length}개</span></div>
    {files.length?<><div className="file-tabs">{files.map(file=><button key={file.name} className={chosen?.name===file.name?'selected':''} onClick={()=>setName(file.name)}>{file.name}</button>)}</div>
      <pre className="file-content">{chosen?.content}</pre><div className="file-meta">{chosen?.bytes} bytes · SHA256 {chosen?.hash.slice(0,12)}<br/>{state?.artifactRoot}</div>{state?.research&&chosen&&<SourcesPanel name={chosen.name}/>}</>:
      <p className="empty-files">{copy.emptyFile}</p>}<DocumentsPanel state={state}/>
  </section>;
}
