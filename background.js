let port;

chrome.runtime.onConnect.addListener(function(p) {
  port = p;
  port.onMessage.addListener(function(msg) {
    if (msg.action === "startCrawl") {
      automatedCrawl(msg.internalLinks);
    }
  });
});

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
          checkLinks(results[0].result.links).then(checkedLinks => {
            results[0].result.checkedLinks = checkedLinks;
            sendResponse(results[0].result);
          });
        } else {
          sendResponse({error: "No results"});
        }
      });
    });
    return true;  // Indicates we will send a response asynchronously
  }
});

function getPageContentAndLinks() {
  const links = Array.from(document.getElementsByTagName('a')).map(a => a.href);
  const currentHostname = window.location.hostname;
  const internalLinks = links.filter(link => {
    try {
      const url = new URL(link);
      return url.hostname === currentHostname;
    } catch (error) {
      return false;
    }
  });
  return {
    url: window.location.href,
    content: document.documentElement.outerHTML,
    links: links,
    internalLinks: internalLinks
  };
}
async function checkLinks(links) {
    const checkedLinks = await Promise.all(links.map(async (link) => {
      if (link.startsWith('mailto:')) {
        return { url: link, status: 'mailto' };
      }
      try {
        const response = await fetch(link, { method: 'GET', mode: 'cors' });
        return { url: link, status: response.status };
      } catch (error) {
        console.error(`Error checking ${link}:`, error);
        // For cross-origin errors, try to at least verify if the page exists
        try {
          const response = await fetch(link, { method: 'HEAD', mode: 'no-cors' });
          return { url: link, status: 'Exists (Cross-origin)' };
        } catch (error) {
          return { url: link, status: 'Error' };
        }
      }
    }));
    return checkedLinks;
  }
  
  async function automatedCrawl(internalLinks) {
    let errors = [];
    let visitedCount = 0;
  
    for (let url of internalLinks) {
      try {
        await new Promise(resolve => chrome.tabs.update({url: url}, resolve));
        await new Promise(resolve => setTimeout(resolve, 2000));  // Wait for page load
  
        let results = await new Promise(resolve => 
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.scripting.executeScript({
              target: {tabId: tabs[0].id},
              function: getPageContentAndLinks
            }, resolve);
          })
        );
  
        if (results && results[0] && results[0].result) {
          let checkedLinks = await checkLinks(results[0].result.links);
          let newErrors = checkedLinks.filter(link => 
            link.status === 404 || 
            link.status === 'Error' || 
            (typeof link.status === 'number' && link.status >= 400)
          );
          errors.push(...newErrors);
        }
      } catch (error) {
        console.error(`Error processing ${url}:`, error);
        errors.push({ url: url, status: 'Error' });
      }
  
      visitedCount++;
      port.postMessage({type: 'progress', data: {visited: visitedCount, total: internalLinks.length, errors: errors.length}});
    }
  
    port.postMessage({type: 'complete', data: errors});
  }
  

async function automatedCrawl(internalLinks) {
  let errors = [];
  let visitedCount = 0;

  for (let url of internalLinks) {
    try {
      await new Promise(resolve => chrome.tabs.update({url: url}, resolve));
      await new Promise(resolve => setTimeout(resolve, 2000));  // Wait for page load

      let results = await new Promise(resolve => 
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: getPageContentAndLinks
          }, resolve);
        })
      );

      if (results && results[0] && results[0].result) {
        let checkedLinks = await checkLinks(results[0].result.links);
        let newErrors = checkedLinks.filter(link => link.status === 404 || link.status === 'Error');
        errors.push(...newErrors);
      }
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
      errors.push({ url: url, status: 'Error' });
    }

    visitedCount++;
    port.postMessage({type: 'progress', data: {visited: visitedCount, total: internalLinks.length, errors: errors.length}});
  }

  port.postMessage({type: 'complete', data: errors});
}