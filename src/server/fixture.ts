export const fixture=`<!doctype html><html lang="ko"><meta charset="utf-8"><title>로컬 연구 자료 · 업무 목록</title>
<style>body{font-family:sans-serif;background:#f2f5f1;color:#20362e;padding:48px}h1{font-size:32px}
button{background:#285846;color:#fff;padding:12px 24px;border:0;border-radius:8px;cursor:pointer}
table{border-collapse:collapse;background:white;margin-top:24px;width:80%}td,th{text-align:left;padding:12px;border-bottom:1px solid #ddd}</style>
<p>R1 검증용 · 작성한 테스트 페이지</p><h1>10개 프로젝트 작업 자료</h1><p>목록 보기를 누르면 실제 표가 표시됩니다.</p>
<button onclick="document.querySelector('table').hidden=false;this.disabled=true">목록 보기</button>
<table hidden><thead><tr><th>번호</th><th>프로젝트</th><th>수량</th></tr></thead><tbody>
${Array.from({length:10},(_,i)=>`<tr><td>${i+1}</td><td>자료 ${String.fromCharCode(65+i)}</td><td>${(i+1)*3}</td></tr>`).join('')}
</tbody></table></html>`;
