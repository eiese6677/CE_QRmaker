window.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;
  const qrDiv = document.getElementById("qrcode");
  qrDiv.innerHTML = "";
  new QRCode(qrDiv, {
    text: url,
    width: 200,
    height: 200,
  });

  // 다운로드 버튼 이벤트
  document.getElementById("downloadBtn").addEventListener("click", () => {
    // QRCode.js는 div 내부에 <img> 또는 <canvas>를 생성함
    const img = qrDiv.querySelector("img") || qrDiv.querySelector("canvas");
    let dataUrl = "";
    if (img && img.tagName === "IMG") {
      dataUrl = img.src;
    } else if (img && img.tagName === "CANVAS") {
      dataUrl = img.toDataURL("image/png");
    }
    if (dataUrl) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "qrcode.png";
      a.click();
    }
  });
  // 요소 선택 버튼
  document.getElementById("selectBtn").addEventListener("click", async () => {
    // inject selector script into the active tab
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["selector.js"],
      });
      window.close(); // close popup to allow clicking on page
    } catch (err) {
      console.error("inject failed", err);
    }
  });
});
