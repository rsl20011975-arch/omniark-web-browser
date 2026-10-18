import {useEffect,useState} from 'react';
import {api} from './api.ts';
type Sources={capturedAt:string;reviewStatus:string;sources:{url?:string;title:string;excerpt:string;truncated:boolean;documentHash?:string;warnings?:string[]}[]};
export function SourcesPanel({name}:{name:string}) {
  const [sources,setSources]=useState<Sources|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;void api<Sources|null>('provenance?name='+encodeURIComponent(name))
    .then(result=>{if(active){setSources(result);setError('');}}).catch(e=>{if(active)setError(String(e));});
    return()=>{active=false;};},[name]);
  if(error)return <p className="error">출처 기록을 읽지 못했습니다: {error}</p>;
  if(!sources)return null;
  return <details className="sources"><summary>읽은 자료 {sources.sources.length}개 · 근거 검토</summary>
    <small>수집: {sources.capturedAt} · 각 문장의 근거는 검토 전입니다.</small>{sources.sources.map((source,index)=><article key={index}>
      {source.url?<a href={source.url} target="_blank" rel="noreferrer">{source.title||source.url}</a>:<strong>{source.title}</strong>}<p>{source.excerpt}</p>
      {source.documentHash&&<small>원본 SHA256: {source.documentHash}</small>}
      {source.warnings?.map(warning=><p key={warning}>{warning}</p>)}
      {source.truncated&&<strong>본문 일부만 수집됨</strong>}</article>)}</details>;
}
