document.addEventListener('DOMContentLoaded', function() {
  const getContentButton = document.getElementById('getContentButton');
  const automateButton = document.getElementById('automateButton');
  const statusDiv = document.getElementById('status');
  const linkList = document.getElementById('linkList');
  const internalLinkList = document.getElementById('internalLinkList');
  const progressBar = document.getElementById('progressBar');
  const reportDiv = document.getElementById('report');

  let internalLinks = [];
  let port = chrome.runtime.connect({name: "crawl"});

  port.onMessage.addListener(function(msg) {
    if (msg.type === 'progress') {
      updateProgress(msg.data);
    } else if (msg.type === 'complete') {
      displayReport(msg.data);
      automateButton.disabled = false;
    }
  });

  function updateStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'blue';
  }

  function checkLinksOnPage() {
    updateStatus("Fetching page content and checking links...");
    chrome.runtime.sendMessage({action: "getPageContent"}, function(response) {
      if (response.error) {
        updateStatus(`Error: ${response.error}`, true);
      } else {
        updateStatus(`Page URL: ${response.url}\nContent length: ${response.content.length}\nLinks found: ${response.links.length}`);
        displayLinks(response.checkedLinks, linkList);
        internalLinks = response.internalLinks;
        displayInternalLinks(internalLinks, internalLinkList);
      }
    });
  }

  function displayLinks(links, container) {
    container.innerHTML = '';
    links.forEach(function(link) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link.url;
      a.textContent = `${link.url} (Status: ${link.status})`;
      a.target = '_blank';
      li.appendChild(a);
      if (link.status === 404 || link.status === 'Error' || (typeof link.status === 'number' && link.status >= 400)) {
        li.style.color = 'red';
      } else if (link.status === 200 || link.status === 'Exists (Cross-origin)') {
        li.style.color = 'green';
      }
      container.appendChild(li);
    });
  }

  function displayInternalLinks(links, container) {
    container.innerHTML = '';
    links.forEach(function(link) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = link;
      a.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.tabs.update({url: link}, function() {
          setTimeout(checkLinksOnPage, 1000);  // Wait for page to load before checking links
        });
      });
      li.appendChild(a);
      container.appendChild(li);
    });
  }

  function startAutomatedCrawl() {
    if (internalLinks.length === 0) {
      updateStatus("No internal links found. Please load a page first.", true);
      return;
    }
    updateStatus("Starting automated crawl...");
    progressBar.style.display = 'block';
    progressBar.value = 0;
    reportDiv.innerHTML = '';
    automateButton.disabled = true;
    port.postMessage({action: "startCrawl", internalLinks: internalLinks});
  }

  function updateProgress(progress) {
    const percentage = (progress.visited / progress.total) * 100;
    progressBar.value = percentage;
    updateStatus(`Crawled: ${progress.visited} of ${progress.total}, Errors found: ${progress.errors}`);
  }

  function displayReport(errors) {
    progressBar.style.display = 'none';
    updateStatus("Crawl complete!");
    reportDiv.innerHTML = `<h3>Crawl Report</h3>`;
    if (errors.length === 0) {
      reportDiv.innerHTML += `<p>No errors found.</p>`;
    } else {
      reportDiv.innerHTML += `<p>Found ${errors.length} errors:</p>`;
      const ul = document.createElement('ul');
      errors.forEach(error => {
        const li = document.createElement('li');
        let statusText = error.status;
        if (error.status === 404) {
          statusText = "404 Not Found";
        } else if (error.status === 'Error') {
          statusText = "Network Error";
        } else if (typeof error.status === 'number' && error.status >= 400) {
          statusText = `${error.status} Error`;
        }
        li.textContent = `${error.url} (Status: ${statusText})`;
        li.style.color = 'red';
        ul.appendChild(li);
      });
      reportDiv.appendChild(ul);
    }
  }

  getContentButton.addEventListener('click', checkLinksOnPage);
  automateButton.addEventListener('click', startAutomatedCrawl);

  // Run the check when popup opens
  checkLinksOnPage();
});