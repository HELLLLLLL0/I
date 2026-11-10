/* Game assets: bubbls/escape-road commit 45b2d69c626dc365753f6922d2c48c4075683ef5.
   Keep this loader and TemplateData files together; no CDN is required. */
(() => {
  const canvas = document.querySelector('#unity-canvas');
  const cover = document.querySelector('#loading-cover');
  const progress = document.querySelector('#progress');
  const status = document.querySelector('#status');
  const retry = document.querySelector('#retry');
  try {
    document.title = localStorage.getItem('customTabName') || 'Escape Road';
  } catch (_) { /* The game can still run with browser storage disabled. */ }
  retry.addEventListener('click', () => location.reload());
  function fail(error) {
    console.error(error);
    cover.hidden = false;
    progress.hidden = true;
    status.textContent = 'Escape Road could not start. ' + (error.message || String(error));
    retry.hidden = false;
  }
  const script = document.createElement('script');
  script.src = 'TemplateData/loader.js';
  script.onerror = () => fail(new Error('The game loader could not be downloaded. Check your connection and retry.'));
  script.onload = async () => {
    try {
      window.unityInstance = await createUnityInstance(canvas, {
        dataUrl: 'TemplateData/data.unityweb',
        frameworkUrl: 'TemplateData/framework.js.unityweb',
        codeUrl: 'TemplateData/wasm.unityweb',
        streamingAssetsUrl: 'StreamingAssets',
        companyName: '1games.io',
        productName: 'Escape Road',
        productVersion: '2.0',
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        showBanner: (message, type) => {
          if (type === 'error') fail(new Error(message));
          else console.warn(message);
        }
      }, value => {
        progress.value = value;
        status.textContent = 'Loading Escape Road… ' + Math.round(value * 100) + '%';
      });
      cover.hidden = true;
      canvas.focus();
    } catch (error) { fail(error); }
  };
  document.body.appendChild(script);
})();
