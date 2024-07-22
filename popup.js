document.addEventListener('DOMContentLoaded', function() {
  const getContentButton = document.getElementById('getContentButton');
  const automateButton = document.getElementById('automateButton');
  const statusDiv = document.getElementById('status');
  const linkList = document.getElementById('linkList');
  const internalLinkList = document.getElementById('internalLinkList');
  const progressContainer = document.querySelector('.progress-container');
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
      statusDiv.style.color = isError ? '#ff6b6b' : '#e0e0e0';
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
        
        const circle = document.createElement('span');
        circle.classList.add('status-circle');
        
        if (link.status === 404 || link.status === 'Error' || (typeof link.status === 'number' && link.status >= 400)) {
            li.classList.add('error');
            circle.classList.add('error-circle');
        } else if (link.status === 200) {
            li.classList.add('success');
            circle.classList.add('success-circle');
        } else if (link.status === 'Exists (Cross-origin)') {
            li.classList.add('neutral');
            circle.classList.add('cross-origin-circle');
        } else if (link.status === 'mailto') {
            li.classList.add('neutral');
        }
        
        li.appendChild(circle);
        li.appendChild(a);
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
      progressContainer.style.display = 'block';
      progressBar.style.width = '0%';
      reportDiv.style.display = 'none';
      reportDiv.innerHTML = '';
      automateButton.disabled = true;
      port.postMessage({action: "startCrawl", internalLinks: internalLinks});
  }

  function updateProgress(progress) {
      const percentage = (progress.visited / progress.total) * 100;
      progressBar.style.width = `${percentage}%`;
      updateStatus(`Crawled: ${progress.visited} of ${progress.total}, Errors found: ${progress.errors}`);
  }

  function displayReport(errors) {
    progressBar.style.width = '100%';
    setTimeout(() => {
        progressContainer.style.display = 'none';
        reportDiv.style.display = 'block';
    }, 500);
    updateStatus("Crawl complete!");
    reportDiv.innerHTML = `<h3>Crawl Report</h3>`;
    if (errors.length === 0) {
        reportDiv.innerHTML += `<p class="success">No errors found.</p>`;
    } else {
        reportDiv.innerHTML += `<p class="error">Found ${errors.length} errors:</p>`;
        const ul = document.createElement('ul');
        errors.forEach(error => {
            const li = document.createElement('li');
            let statusText = error.status;
            let statusClass = '';
            
            if (error.status === 404) {
                statusText = "404 Not Found";
                statusClass = 'error-circle';
            } else if (error.status === 'Error') {
                statusText = "Network Error";
                statusClass = 'error-circle';
            } else if (typeof error.status === 'number' && error.status >= 400) {
                statusText = `${error.status} Error`;
                statusClass = 'error-circle';
            }
            
            li.innerHTML = `
                <div class="error-item">
                    <span class="status-circle ${statusClass}"></span>
                    <div class="error-details">
                        <a href="${error.url}" target="_blank" class="error-url">${error.url}</a>
                        <span class="error-status">(Status: ${statusText})</span>
                        <span class="error-source">Found on: <a href="${error.foundOn}" target="_blank">${error.foundOn}</a></span>
                    </div>
                </div>
            `;
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