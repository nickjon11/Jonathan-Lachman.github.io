/* Pentagon Island desktop window and two-way theme bridge. */
(() => {
  const frame = document.querySelector('#pentagon-window iframe');
  if (!frame) return;
  let topZ = 20000;
  let gameDoc, gameWin, observer;
  const desktop = document.createElement('div');
  desktop.id = 'pentagon-desktop-popups';
  document.body.append(desktop);
  const popupByLayer = new Map();
  const themeFromSite = () => document.body.classList.contains('dark-mode') ? 'dark' : 'light';
  let syncing = false;
  function syncToGame() {
    if (!gameDoc || syncing) return;
    const desired = themeFromSite();
    if (gameDoc.body.classList.contains('dark-theme') !== (desired === 'dark')) {
      syncing = true;
      gameDoc.getElementById('theme-' + desired)?.click();
      syncing = false;
    }
    desktop.classList.toggle('pentagon-dark', desired === 'dark');
  }
  function syncFromGame() {
    if (!gameDoc || syncing) return;
    const desired = gameDoc.body.classList.contains('dark-theme') ? 'dark' : 'light';
    if (desired !== themeFromSite()) {
      syncing = true;
      document.querySelector('.theme-' + desired)?.click();
      syncing = false;
    }
    desktop.classList.toggle('pentagon-dark', desired === 'dark');
  }
  function floating(title, width = 500) {
    const win = document.createElement('section');
    win.className = 'pentagon-floating';
    win.style.width = `min(${width}px, calc(100vw - 20px))`;
    win.style.left = `${Math.max(8, Math.min(innerWidth - 150, 130 + (desktop.children.length % 7) * 26))}px`;
    win.style.top = `${Math.max(8, Math.min(innerHeight - 80, 110 + (desktop.children.length % 7) * 26))}px`;
    win.style.zIndex = ++topZ;
    win.innerHTML = `<div class="pentagon-floating-bar"><strong></strong><button type="button" aria-label="Close">×</button></div><div class="pentagon-floating-content"></div>`;
    win.querySelector('strong').textContent = title;
    win.addEventListener('pointerdown', () => { win.style.zIndex = ++topZ; });
    const bar = win.querySelector('.pentagon-floating-bar');
    bar.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      const x = e.clientX, y = e.clientY, l = win.offsetLeft, t = win.offsetTop;
      bar.setPointerCapture(e.pointerId);
      const move = p => {
        win.style.left = `${Math.max(0, Math.min(innerWidth - 80, l + p.clientX - x))}px`;
        win.style.top = `${Math.max(0, Math.min(innerHeight - 36, t + p.clientY - y))}px`;
      };
      const end = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', end); bar.removeEventListener('pointercancel', end); };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
    });
    desktop.append(win);
    return win;
  }
  function copyHelp() {
    gameDoc.querySelectorAll('#help-window-layer > .help-window').forEach(source => {
      const win = floating(source.querySelector('.help-titlebar strong')?.textContent || 'HELP', 490);
      const body = win.querySelector('.pentagon-floating-content');
      body.innerHTML = source.querySelector('.help-content')?.innerHTML || '';
      const footer = document.createElement('div');
      footer.className = 'pentagon-floating-footer';
      footer.textContent = source.querySelector('.help-status')?.textContent || 'PENTAGON ISLAND';
      win.append(footer);
      win.querySelector('button').onclick = () => win.remove();
      source.remove();
    });
  }
  function syncLayer(id, title, width) {
    const source = gameDoc.getElementById(id);
    if (!source) return;
    const visible = !source.classList.contains('hidden');
    let win = popupByLayer.get(id);
    if (!visible) {
      if (win) { win.remove(); popupByLayer.delete(id); }
      return;
    }
    if (!win) {
      win = floating(title, width);
      popupByLayer.set(id, win);
      win.querySelector('button').onclick = () => {
        const closeId = id === 'trade-layer' ? 'trade-close' : 'ai-offer-no';
        gameDoc.getElementById(closeId)?.click();
        if (id === 'trade-layer') { win.remove(); popupByLayer.delete(id); }
      };
    }
    const sourceDialog = source.querySelector('.trade-dialog');
    const dest = win.querySelector('.pentagon-floating-content');
    // Keep the game's live controls and validation authoritative. Only mirror their view.
    const sourceContent = sourceDialog?.querySelector('.trade-content');
    if (!sourceContent) return;
    const markup = sourceContent.innerHTML;
    if (dest.innerHTML !== markup) dest.innerHTML = markup;
    // Forward clicks by button position, including dynamically generated +/- buttons
    // which have no IDs. Event delegation survives the DOM mirror refreshing.
    if (!dest.dataset.tradeForwarding) {
      dest.dataset.tradeForwarding = '1';
      dest.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || button.disabled) return;
        const localButtons = [...dest.querySelectorAll('button')];
        const index = localButtons.indexOf(button);
        const original = source.querySelectorAll('.trade-content button')[index];
        if (original && !original.disabled) original.click();
        queueUpdate();
      });
    }

  }
  let queued = false;
  function update() {
    if (!gameDoc) return;
    copyHelp();
    syncLayer('trade-layer', '↔ TRADE WITH COMPUTER 1 (AI)', 620);
    syncLayer('ai-offer-layer', '↔ COMPUTER 1 (AI) OFFERS A TRADE', 540);
  }
  function queueUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }
  function initialize() {
    observer?.disconnect();
    desktop.replaceChildren(); popupByLayer.clear();
    try { gameDoc = frame.contentDocument; gameWin = frame.contentWindow; } catch { return; }
    if (!gameDoc?.body) return;
    gameDoc.body.classList.add('pentagon-portal-mode');
    const sheet = gameDoc.createElement('style');
    sheet.textContent = 'body.pentagon-portal-mode #trade-layer, body.pentagon-portal-mode #ai-offer-layer {display:none!important}';
    gameDoc.head.append(sheet);
    observer = new MutationObserver(queueUpdate);
    for (const id of ['help-window-layer','trade-layer','ai-offer-layer']) {
      const node = gameDoc.getElementById(id);
      if (node) observer.observe(node, {attributes:true,childList:true,subtree:true,characterData:true});
    }
    new MutationObserver(syncFromGame).observe(gameDoc.body, {attributes:true,attributeFilter:['class']});
    syncToGame(); update();
  }
  frame.addEventListener('load', initialize);
  if (frame.contentDocument?.readyState === 'complete') initialize();
  new MutationObserver(syncToGame).observe(document.body, {attributes:true,attributeFilter:['class']});
})();
