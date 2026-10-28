(() => {
  const apps = {
    'sftp-window': {name:'SFTP Manager.exe',icon:'🗄️',version:'v0.7.5',tech:'Python · PySide6 · Paramiko · Docker',desc:'A Windows SFTP client that connects to a Docker-hosted SFTP server on a Debian virtual machine. The repository includes a compiled Windows application, source code, Dockerfile, and setup instructions.',url:'https://github.com/nickjon11/SFTP_Manager',source:'GitHub README'},
    'pentagon-window': {name:'Pentagon Island.exe',icon:'🎮',version:'Web Demo',tech:'Python · FastAPI · WebSockets',desc:'A multiplayer board-game prototype with room creation, host-controlled starts, WebSocket synchronization, dice rolls, turn passing, and a game log. The public repository README describes an earlier prototype; the portfolio demo may have newer features.',url:'https://github.com/nickjon11/Pentagon-Island.exe',source:'GitHub README'},
    'luclid-window': {name:'Luclid-ii.exe',icon:'🤖',version:'Web Demo',tech:'Python · PySide6 · Ollama · GitHub',desc:'A Windows-first AI agent powered by a local Ollama model. Its repository documents chat, document attachments, GitHub browsing, and job-assistant tools. The portfolio web demo runs separately in the browser.',url:'https://github.com/nickjon11/Luclid-ii',source:'GitHub README'},
    'fileserver-window': {name:'File Server',icon:'📁',version:'Portfolio Project',tech:'File transfer · Server administration',desc:'A file-transfer and server project featured in this portfolio. See its project window for the original description.',source:'Portfolio project description'},
    'fastapi-window': {name:'FastAPI Calculator',icon:'🧮',version:'Portfolio Project',tech:'Python · FastAPI · PostgreSQL · Docker',desc:'A calculator application built with FastAPI and related backend technologies. See its project window for details.',source:'Portfolio project description'},
    'taxbot-window': {name:'AI TaxBot',icon:'📊',version:'Portfolio Project',tech:'AI · Application development',desc:'An AI-based tax-assistant project showcased in the portfolio. See its project window for details.',source:'Portfolio project description'}
  };
  let menu, dialog;
  function hideMenu(){menu?.remove();menu=null}
  function closeDialog(){dialog?.remove();dialog=null}
  function showProperties(id){
    const a=apps[id]; if(!a)return; hideMenu();closeDialog();
    dialog=document.createElement('div');dialog.id='retro-properties-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',a.name+' Properties');
    const title=document.createElement('div');title.className='prop-title';
    const titleText=document.createElement('span');titleText.textContent=a.name+' Properties';
    const x=document.createElement('button');x.textContent='×';x.setAttribute('aria-label','Close');x.onclick=closeDialog;title.append(titleText,x);
    const body=document.createElement('div');body.className='prop-body';
    const name=document.createElement('div');name.className='prop-name';
    const ico=document.createElement('span');ico.className='prop-icon';ico.textContent=a.icon;
    const heading=document.createElement('div');const strong=document.createElement('strong');strong.textContent=a.name;const ver=document.createElement('div');ver.textContent=a.version;heading.append(strong,ver);name.append(ico,heading);
    const tech=document.createElement('div');tech.textContent='Technologies: '+a.tech;
    const desc=document.createElement('div');desc.className='prop-desc';desc.textContent=a.desc;
    const source=document.createElement('small');source.textContent='Description source: '+a.source;
    const actions=document.createElement('div');actions.className='prop-actions';
    if(a.url){const link=document.createElement('a');link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View on GitHub ↗';actions.append(link)}
    const ok=document.createElement('button');ok.textContent='OK';ok.onclick=closeDialog;actions.append(ok);
    body.append(name,tech,desc,source,actions);dialog.append(title,body);document.body.append(dialog);x.focus();
    let dragging=false,dx=0,dy=0;
    title.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const rect=dialog.getBoundingClientRect();dialog.style.transform='none';dialog.style.left=rect.left+'px';dialog.style.top=rect.top+'px';dragging=true;dx=e.clientX-rect.left;dy=e.clientY-rect.top;title.setPointerCapture(e.pointerId)});
    title.addEventListener('pointermove',e=>{if(!dragging)return;dialog.style.left=Math.max(0,Math.min(innerWidth-dialog.offsetWidth,e.clientX-dx))+'px';dialog.style.top=Math.max(0,Math.min(innerHeight-dialog.offsetHeight,e.clientY-dy))+'px'});
    title.addEventListener('pointerup',()=>dragging=false);
  }
  document.addEventListener('contextmenu',e=>{
    const icon=e.target.closest('.file-icon[data-window],.desktop-icon[data-window]');
    if(!icon || !apps[icon.dataset.window])return;
    e.preventDefault();hideMenu();menu=document.createElement('div');menu.id='retro-properties-menu';
    const open=document.createElement('button');open.textContent='Open';open.onclick=()=>{hideMenu();icon.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))};
    const prop=document.createElement('button');prop.textContent='Properties';prop.onclick=()=>showProperties(icon.dataset.window);
    menu.append(open,prop);document.body.append(menu);
    menu.style.left=Math.min(e.clientX,innerWidth-menu.offsetWidth-5)+'px';menu.style.top=Math.min(e.clientY,innerHeight-menu.offsetHeight-5)+'px';
  });
  document.addEventListener('click',e=>{if(menu&&!e.target.closest('#retro-properties-menu'))hideMenu()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){hideMenu();closeDialog()}});
  // Accessible alternate: Shift+F10 on focused project icon.
  document.addEventListener('keydown',e=>{if(e.key==='F10'&&e.shiftKey){const icon=document.activeElement;if(icon?.matches?.('.file-icon[data-window],.desktop-icon[data-window]')&&apps[icon.dataset.window]){e.preventDefault();showProperties(icon.dataset.window)}}});
  window.portfolioShowProperties=showProperties;
})();
