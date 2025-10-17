chrome.action.onClicked.addListener(async (tab) => {
  const url = tab.url;
  const qrPage =
    chrome.runtime.getURL("qr.html") + `?url=${encodeURIComponent(url)}`;
  chrome.tabs.create({ url: qrPage });
});
