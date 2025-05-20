let maps = ['a-balanced-world', 'a-pro-world', 'an-arbitrary-world', 'an-arbitrary-rural-world','a-balanced-south-america','a-balanced-europe','a-balanced-north-america','a-balanced-asia','a-balanced-africa','a-balanced-oceania'];
let coords = null;
let lastDetectedCoords = null;
let num = 0;

async function getRandomCoords(map) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'getCoords', map }, (response) => {
      if (response.success && response.data.ready && Array.isArray(response.data.locations)) {
        const locations = response.data.locations;
        const random = locations[Math.floor(Math.random() * locations.length)];
        resolve({ lat: random.lat, lng: random.lng });
      } else {
        reject(response.error || "Invalid response");
      }
    });
  });
}

async function init() {
  try {
    const map = maps[Math.floor(Math.random() * maps.length)];
    coords = await getRandomCoords(map);
    injectStaticMap();
  } catch (error) {
    console.error("Error fetching coordinates:", error);
  }
}

function injectStaticMap() {
  if (document.getElementById('static-map-container')) return;

  const container = document.createElement('div');
  container.id = 'static-map-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.left = '20px';
  container.style.zIndex = '9999';
  container.style.background = '#ffffff';
  container.style.borderRadius = '12px';
  container.style.padding = '16px';
  container.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
  container.style.fontFamily = 'Segoe UI, Roboto, sans-serif';
  container.style.width = 'max-content';
  container.style.maxWidth = 'calc(100% - 40px)';

  const iframeWrapper = document.createElement('div');
  iframeWrapper.style.pointerEvents = 'none';
  iframeWrapper.style.overflow = 'hidden';
  iframeWrapper.style.borderRadius = '10px';

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.worldguessr.com/svEmbed?nm=true&npz=true&showRoadLabels=false&lat=${coords.lat}&long=${coords.lng}&showAnswer=false`;
  iframe.width = '400';
  iframe.height = '300';
  iframe.style.border = '0';

  iframeWrapper.appendChild(iframe);
  container.appendChild(iframeWrapper);

  const coordsText = document.createElement('div');
  coordsText.id = 'coords-text';
  coordsText.style.marginTop = '10px';
  coordsText.style.fontSize = '14px';
  coordsText.style.color = '#333';

  const guessBtn = document.createElement('button');
  guessBtn.textContent = 'Guess';
  guessBtn.style.marginTop = '12px';
  guessBtn.style.padding = '10px 20px';
  guessBtn.style.cursor = 'pointer';
  guessBtn.style.border = 'none';
  guessBtn.style.borderRadius = '6px';
  guessBtn.style.backgroundColor = '#007bff';
  guessBtn.style.color = '#ffffff';
  guessBtn.style.fontSize = '15px';
  guessBtn.style.fontWeight = 'bold';
  guessBtn.style.boxShadow = '0 2px 6px rgba(0, 123, 255, 0.3)';
  guessBtn.style.transition = 'background 0.2s ease';
  guessBtn.onmouseenter = () => (guessBtn.style.backgroundColor = '#0069d9');
  guessBtn.onmouseleave = () => (guessBtn.style.backgroundColor = '#007bff');

  const resultDiv = document.createElement('div');
  resultDiv.id = 'distance-result';
  resultDiv.style.marginTop = '10px';
  resultDiv.style.fontSize = '14px';
  resultDiv.style.color = '#333';

  guessBtn.onclick = () => {
    if (!lastDetectedCoords) {
      resultDiv.textContent = 'No coordinates detected yet.';
      return;
    }

    num += 1;
    const distance = calculateDistance(coords.lat, coords.lng, lastDetectedCoords.lat, lastDetectedCoords.lng);
    let displayedDist;

    if (distance >= 10000) {
      displayedDist = "10000 to 15000 km away";
    } else if (distance >= 5000) {
      displayedDist = "5000 to 10000 km away";
    } else if (distance >= 2500) {
      displayedDist = "2500 to 5000 km away";
    } else if (distance >= 1000) {
      displayedDist = "1000 to 2500 km away";
    } else if (distance > 0.2) {
      let diff;
      if (distance >= 100) diff = 100;
      else if (distance >= 10) diff = 10;
      else if (distance >= 1) diff = 1;
      else diff = 0.1;

      const low = Math.floor(distance / diff) * diff;
      const high = low + diff;
      displayedDist = `${low} to ${high} km away`;
    } else {
      resultDiv.innerHTML = `🎯 You found it in ${num} tries! <a href="https://www.google.com/maps?q=&layer=c&cbll=${coords.lat},${coords.lng}" target="_blank" style="color:#007bff; text-decoration:none;">View Street View</a>`;
    }

    if (distance >= 0.2) {
      resultDiv.textContent = `${num}. ${displayedDist}`;
    }
  };

  container.appendChild(coordsText);
  container.appendChild(guessBtn);
  container.appendChild(resultDiv);
  document.body.appendChild(container);
}

function updateDetectedCoords(coordsTxt) {
  const [lat, lng] = coordsTxt.split(',').map(Number);
  lastDetectedCoords = { lat, lng };
  document.getElementById('coords-text').textContent = 'Current coordinates: '+lat+', '+lng;
}

function observeForCoordinateButtons() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          const button = node.matches?.('button[aria-label]')
            ? node
            : node.querySelector?.('button[aria-label]');

          if (button && /^[\d.\-]+,\s*[\d.\-]+$/.test(button.getAttribute('aria-label'))) {
            const coordsTxt = button.getAttribute('aria-label');
            updateDetectedCoords(coordsTxt);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

init();
observeForCoordinateButtons();
