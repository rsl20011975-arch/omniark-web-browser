import {useState} from 'react';
import {api,conversation,type State} from './api.ts';
export function Conversations({state}:{state:State|null}) {
  const [query,setQuery]=useState(''),[results,setResults]=useState<{conversationId:string;content:string}[]>([]);
  const [error,setError]=useState('');
  const select=(id:string)=>{localStorage.setItem('conversation',id);location.reload();};
  async function search(){try{setResults(await api('search?q='+encodeURIComponent(query)));setError('');}catch(e){setError(String(e));}}
  if(!state?.research)return null;
  return <section className="conversation-tools"><div><select aria-label="저장된 대화" value={conversation} onChange={event=>select(event.target.value)}>
    <option value={conversation}>현재 대화</option>{state.conversations?.filter(item=>item.id!==conversation).map(item=><option key={item.id} value={item.id}>{item.title.slice(0,36)}</option>)}
    </select><button onClick={()=>select(crypto.randomUUID())}>새 대화</button></div>
    <div><input aria-label="대화 검색" placeholder="이전 작업 찾기" value={query} onChange={event=>setQuery(event.target.value)}/><button disabled={!query.trim()} onClick={()=>void search()}>검색</button></div>
    {results.map((item,index)=><button className="search-hit" key={index} onClick={()=>select(item.conversationId)}>{item.content.slice(0,90)}</button>)}
    {error&&<p role="alert">{error}</p>}</section>;
}
