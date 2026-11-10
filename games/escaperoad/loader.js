/* Game assets: bubbls/escape-road commit 45b2d69c626dc365753f6922d2c48c4075683ef5.
   Keep this loader and TemplateData files together. Firebase is required by this build. */
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
  let starting = true;
  let failed = false;
  // Firebase auth callbacks may arrive before createUnityInstance resolves.
  const pendingMessages = [];
  window.unityInstance = { SendMessage: (...args) => pendingMessages.push(args) };
  window.addEventListener('error', event => {
    if (starting && event.error) { failed = true; fail(event.error); }
  });
  window.addEventListener('unhandledrejection', event => {
    if (starting) { failed = true; fail(event.reason || new Error('Startup failed')); }
  });
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => reject(new Error('Timed out loading ' + src)), 30000);
      script.src = src;
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('Could not load ' + src + '. Check your connection or content blocker, then retry.')); };
      document.head.appendChild(script);
    });
  }
  async function start() {
    try {
      status.textContent = 'Preparing Escape Road…';
      await loadScript('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
      await Promise.all(['auth', 'firestore', 'analytics'].map(name =>
        loadScript('https://www.gstatic.com/firebasejs/10.9.0/firebase-' + name + '-compat.js')));
      // Public client configuration from this game's original HTML.
      const firebaseConfig = {
  apiKey: "AIzaSyC2RwMfh0GMuQMtQdijjUo-MEffB4N9xVY",
  authDomain: "escape-road-gm1.firebaseapp.com",
  projectId: "escape-road-gm1",
  storageBucket: "escape-road-gm1.appspot.com",
  messagingSenderId: "713881704715",
  appId: "1:713881704715:web:615cc93a73d9814b24ea0e",
  measurementId: "G-E8C3TNJE0S"
};
      firebase.initializeApp(firebaseConfig);
      await loadScript('TemplateData/loader.js');
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
        if (!failed) status.textContent = value >= 0.9 ? 'Starting Escape Road…' : 'Loading Escape Road… ' + Math.round(value * 100) + '%';
      });
      starting = false;
      for (const args of pendingMessages.splice(0)) window.unityInstance.SendMessage(...args);
      if (!failed) cover.hidden = true;
      canvas.focus();
    } catch (error) { starting = false; fail(error); }
  }
  start();
})();
