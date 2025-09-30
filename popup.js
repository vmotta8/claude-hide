chrome.storage.sync.get(['hideProjectChats'], function(result) {
  const isEnabled = result.hideProjectChats !== false;
  document.getElementById('toggleHide').checked = isEnabled;
});

document.getElementById('toggleHide').addEventListener('change', function(e) {
  chrome.storage.sync.set({ hideProjectChats: e.target.checked });
});
