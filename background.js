chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "getCoords") {
      fetch("https://api.worldguessr.com/mapLocations/" + request.map)
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
  });
  