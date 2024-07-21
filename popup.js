document.addEventListener('DOMContentLoaded', function() {
  const getContentButton = document.getElementById('getContentButton');
  const statusDiv = document.getElementById('status');
  const linkList = document.getElementById('linkList');

  function updateStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'blue';
  }

  getContentButton.addEventListener('click', function() {
    updateStatus("Fetching page content and checking links...");
    chrome.runtime.sendMessage({action: "getPageContent"}, function(response) {
      if (response.error) {
        updateStatus(`Error: ${response.error}`, true);
      } else {
        updateStatus(`Page URL: ${response.url}\nContent length: ${response.content.length}\nLinks found: ${response.links.length}`);
        linkList.innerHTML = '';
        response.checkedLinks.forEach(function(link) {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = link.url;
          a.textContent = `${link.url} (Status: ${link.status})`;
          a.target = '_blank';
          li.appendChild(a);
          if (link.status === 404) {
            li.style.color = 'red';
          } else if (link.status === 200) {
            li.style.color = 'green';
          }
          linkList.appendChild(li);
        });
      }
    });
  });
});