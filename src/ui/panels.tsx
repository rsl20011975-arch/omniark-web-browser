import {useState} from 'react';
import type {State} from './api.ts';
import {copy} from './copy.ts';
export function BrowserPanel({state,image}:{state:State|null;image:string|null}) {
  return <section className="browser-panel"><div className="pane-heading"><span>{copy.browser}</span><span className="badge">전용 세션</span></div>
    <div className="address">{state?.browser?.url??'아직 열린 페이지 없음'}</div>
    {image?<><img className="browser-image" src={image} alt="실제 Chromium의 마지막 관찰 화면"/><div className="caption">실제 브라우저 · 마지막 도구 실행 시점의 화면</div></>:
      <div className="browser-empty"><div className="line-mark"/><h2>{copy.emptyBrowser}</h2><p>{copy.browserHelp}</p></div>}
  </section>;
}
export function FilePanel({state}:{state:State|null}) {
  const [name,setName]=useState('');const files=state?.artifacts??[];
  const chosen=files.find(f=>f.name===name)??files[0];
  return <section className="files-panel"><div className="pane-heading"><span>{copy.files}</span><span className="badge">{files.length}개</span></div>
    {files.length?<><div className="file-tabs">{files.map(file=><button key={file.name} className={chosen?.name===file.name?'selected':''} onClick={()=>setName(file.name)}>{file.name}</button>)}</div>
      <pre className="file-content">{chosen?.content}</pre><div className="file-meta">{chosen?.bytes} bytes · SHA256 {chosen?.hash.slice(0,12)}<br/>{state?.artifactRoot}</div></>:
      <p className="empty-files">{copy.emptyFile}</p>}
  </section>;
}
