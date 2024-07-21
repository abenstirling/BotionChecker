chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageContent") {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: getPageContentAndLinks
        }, (results) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            sendResponse({error: chrome.runtime.lastError.message});
          } else if (results && results[0]) {
            sendResponse(results[0].result);
          } else {
            sendResponse({error: "No results"});
          }
        });
      });
      return true;  // Indicates we will send a response asynchronously
    }
  });
  
  function getPageContentAndLinks() {
    console.log("getPageContentAndLinks function called");
    const links = Array.from(document.getElementsByTagName('a')).map(a => a.href);
    console.log(`Found ${links.length} links on the page`);
    return {
      url: window.location.href,
      content: document.documentElement.outerHTML,
      links: links
    };
  }