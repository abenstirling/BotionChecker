document.addEventListener('DOMContentLoaded', function() {
  const getContentButton = document.getElementById('getContentButton');
  const statusDiv = document.getElementById('status');
  const linkList = document.getElementById('linkList');

  function updateStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? 'red' : 'blue';
  }

  getContentButton.addEventListener('click', function() {
    updateStatus("Fetching page content...");
    chrome.runtime.sendMessage({action: "getPageContent"}, function(response) {
      if (response.error) {
        updateStatus(`Error: ${response.error}`, true);
      } else {
        updateStatus(`Page URL: ${response.url}\nContent length: ${response.content.length}\nLinks found: ${response.links.length}`);
        linkList.innerHTML = '';
        response.links.forEach(function(link) {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = link;
          a.textContent = link;
          a.target = '_blank';
          li.appendChild(a);
          linkList.appendChild(li);
        });
      }
    });
  });
});
