export {};

const toogle = () => {
  const iframe = document.getElementById("pageassist-iframe");
  const widget = document.getElementById("pageassist-icon");
  if (iframe) {
    const display = iframe.style.display;
    if (display === "none") {
      if (widget) {
        widget.style.display = "none";
      }
      iframe.style.display = "block";
    } else {
      iframe.style.display = "none";
      // if user enabled show widget in settings and close from action then show widget will be disappear inorder to show widget again we need to reload the page
    }
  }
};

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: toogle,
  });
});
