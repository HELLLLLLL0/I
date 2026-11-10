(() => {
  const status = document.querySelector('#status'), message = document.querySelector('#message'), retry = document.querySelector('#retry');
  retry.onclick = () => location.reload();
  try { document.title = localStorage.getItem('customTabName') || 'Karlson'; } catch (_) {}
  function fail(error) { status.hidden = false; message.textContent = 'Karlson could not load. ' + (error.message || error); retry.hidden = false; }
  window.addEventListener('error', e => fail(e.error || e.message));
  window.addEventListener('unhandledrejection', e => fail(e.reason));
  window.wasmBinaryFilee = new URL('Build/tyj.wasm.code.unityweb', location.href).href;
  try {
    window.gameInstance = UnityLoader.instantiate('unityContainer', 'Build/tyj.json', {
      onProgress: (instance, value) => { message.textContent = 'Loading Karlson… ' + Math.round(value * 100) + '%'; },
      Module: {onRuntimeInitialized: () => { status.hidden = true; }}
    });
  } catch (error) { fail(error); }
})();
