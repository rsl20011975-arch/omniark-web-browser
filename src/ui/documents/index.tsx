import {useRef,useState} from 'react';
import {api,type State} from '../api.ts';
export function DocumentsPanel({state}:{state:State|null}) {
  const input=useRef<HTMLInputElement>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  if(!state?.documents)return null;
  async function upload(file:File|undefined) {
    if(!file)return;setBusy(true);setError('');
    try {
      if(file.size>20000000)throw Error('20MB 이하 파일을 선택해주세요.');
      const base64=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();reader.onerror=()=>reject(Error('파일을 읽지 못했습니다.'));
        reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.readAsDataURL(file);
      });
      await api('documents',{name:file.name,base64});
    }catch(e){setError(String(e));}finally{setBusy(false);}
  }
  return <section className="document-input"><div><strong>참고 문서</strong><button disabled={busy} onClick={()=>input.current?.click()}>{busy?'첨부 중…':'문서 첨부'}</button></div>
    <input type="file" ref={input} hidden accept=".pdf,.docx,.xlsx" onChange={event=>void upload(event.target.files?.[0])}/>
    <p>PDF · Word · Excel을 첨부하고 채팅에서 파일 이름을 지정하세요.</p>
    {state.documents.map(file=><p key={file.name}>{file.name} · {file.bytes} bytes</p>)}{error&&<p role="alert">{error}</p>}
  </section>;
}
