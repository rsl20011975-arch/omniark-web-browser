document.getElementById('open').addEventListener('click',()=>{
  chrome.tabs.getCurrent().then(tab=>chrome.sidePanel.open({windowId:tab.windowId}))
    .then(()=>{document.getElementById('status').textContent='오른쪽 패널에 작업을 입력하세요.';})
    .catch(error=>{document.getElementById('status').textContent=String(error);});
});
