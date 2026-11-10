(async () => {
  const status = document.querySelector('#loading-text');
  const retry = document.querySelector('#retry');
  const progress = document.querySelector('#unity-progress-bar-full');
  const nativeFetch = window.fetch.bind(window);
  retry.onclick = () => location.reload();
  function fail(error) {
    console.error(error);
    status.hidden = false;
    status.textContent = 'Silksong could not load. ' + (error.message || String(error));
    retry.hidden = false;
  }
  try {
    try { document.title = localStorage.getItem('customTabName') || 'Silksong'; } catch (_) {}
    // Fail before launching Unity if streaming decompression isn't supported.
    new DecompressionStream('deflate-raw');
    const result = await nativeFetch('zip-index.json');
    if (!result.ok) throw new Error('Could not load the asset index.');
    const index = await result.json();
    let cache = null;
    try { cache = await caches.open('silksong-parts-' + index.revision); } catch (_) {}
    const zip = new SplitZip(index, {fetch: nativeFetch, cache, onProgress: text => {
      status.hidden = false;
      status.textContent = text;
    }});
    const assetPrefix = new URL('StreamingAssets/aa/WebGL/', location.href).href;
    window.fetch = async (resource, options) => {
      const url = new URL(resource instanceof Request ? resource.url : resource, location.href);
      if (url.href.startsWith(assetPrefix)) {
        try { return await zip.response(decodeURIComponent(url.pathname.split('/').pop())); }
        catch (error) { fail(error); throw error; }
      }
      return nativeFetch(resource, options);
    };
    // Old all-at-once caches are intentionally not read. Never clear IndexedDB saves.
    window.unityInstance = await createUnityInstance(document.querySelector('#unity-canvas'), {
      dataUrl: 'Build/w-pt.data.unityweb',
      frameworkUrl: 'Build/w-pt.framework.js.unityweb',
      codeUrl: 'Build/w-pt.wasm.unityweb',
      streamingAssetsUrl: 'StreamingAssets',
      companyName: 'EDUrocks Group, Truffled, GN-Math',
      productName: 'Hollow Knight SilkSong', productVersion: '1.0',
      showBanner: (message, type) => { if (type === 'error') fail(new Error(message)); }
    }, value => { progress.style.width = Math.round(value * 100) + '%'; });
    document.querySelector('#unity-loading-bar').hidden = true;
    status.hidden = true;
    document.querySelector('#unity-canvas').focus();
  } catch (error) { fail(error); }
})();
