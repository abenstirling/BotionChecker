function getAllLinks() {
  const links = Array.from(document.getElementsByTagName('a'));
  const currentHostname = window.location.hostname;
  
  const siteLinks = links.filter(link => {
    try {
      const url = new URL(link.href);
      return url.hostname === currentHostname;
    } catch (error) {
      console.warn('Invalid URL:', link.href);
      return false;
    }
  });
  
  return siteLinks.map(link => link.href);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getLinks") {
    sendResponse({ links: getAllLinks() });
  }
  return true; // Indicates that the response will be sent asynchronously
});
