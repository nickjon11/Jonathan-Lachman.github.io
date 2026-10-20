'use strict';
const $ = id => document.getElementById(id);
let socket = null, currentRoom = null, currentPlayer = null, playerToken = null;
let isSpectator = false;
let latestRoom = null, pingMs = null, pingSent = new Map(), pingCounter = 0;
const getHost = () => latestRoom && latestRoom.host === currentPlayer;
function showScreen(name) {
  const active = name !== 'home-screen';
  document.querySelector('.game-menu').classList.toggle('hidden', !active);
  document.querySelector('.multiplayer-menu').classList.toggle('hidden', !active);
  if (!active) { $('game-dropdown').classList.add('hidden'); $('multiplayer-dropdown').classList.add('hidden'); }
  ['home-screen','lobby-screen','game-screen'].forEach(id => $(id).classList.toggle('hidden', id !== name));
}
function showLobby(code, player, token, spectator=false) {
  isSpectator = spectator;
  currentRoom = code; currentPlayer = player; playerToken = token;
  $('lobby-room-code').textContent = code;
  $('footer-room').textContent = '| ' + code;
  showScreen('lobby-screen'); showConnection('Connecting to multiplayer session...'); connectWebSocket();
}
function connectWebSocket() {
  if (socket) socket.close();
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${scheme}//${location.host}/ws/${encodeURIComponent(currentRoom)}?token=${encodeURIComponent(playerToken)}`);
  socket = ws;
  ws.onopen = () => { console.log('Connected to', currentRoom); $('connection-status').textContent='Synchronizing room...'; sendPing(); };
  ws.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.type === 'room_update') { updateRoom(data.room); hideConnection(); }
    if (data.type === 'session_ended' || data.type === 'kicked') { const kicked=data.type==='kicked'; returnHome(); showNotice(kicked?'REMOVED FROM ROOM':'SESSION ENDED',kicked?'The host has removed you from this session.':'The host has ended the session.'); }
    if (data.type === 'pong' && pingSent.has(data.id)) {
      pingMs = Math.round(performance.now() - pingSent.get(data.id));
      pingSent.delete(data.id); if (latestRoom) renderPlayers(latestRoom);
    }
  };
  ws.onclose = () => { console.log('Disconnected'); if (socket === ws) hideConnection(); };
  ws.onerror = error => { hideConnection(); console.error('WebSocket error', error); };
}
function sendPing() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const id = ++pingCounter;
  pingSent.set(id, performance.now());
  socket.send(JSON.stringify({type:'ping', id}));
  if (pingSent.size > 10) pingSent.clear();
}
setInterval(sendPing, 3000);
function updateRoom(room) {
  latestRoom = room;
  $('player-list').replaceChildren();
  room.players.forEach(player => {
    const entry = document.createElement('div'); entry.className = 'player-entry';
    const name = document.createElement('span'); name.textContent = '● ' + player; entry.append(name);
    if (player === room.host) { const label = document.createElement('span'); label.className='host-label'; label.textContent='[HOST]'; entry.append(label); }
    $('player-list').append(entry);
  });
  (room.spectators||[]).forEach(name=>{ const entry=document.createElement('div');entry.className='player-entry';entry.textContent='◉ '+name+' [SPECTATOR]';$('player-list').append(entry); });
  let lobbyAi = document.getElementById('lobby-ai-control');
  if (!lobbyAi) {
    lobbyAi = document.createElement('div'); lobbyAi.id='lobby-ai-control';lobbyAi.className='lobby-ai-control';
    $('player-list').insertAdjacentElement('beforebegin',lobbyAi);
  }
  lobbyAi.replaceChildren();
  if (!room.started && currentPlayer === room.host) {
    const label=document.createElement('label');label.textContent='Add AI player: ';
    const select=document.createElement('select');select.setAttribute('aria-label','Number of AI players');
    for(let n=1;n<=3;n++){const option=document.createElement('option');option.value=n;option.textContent=n===1?'Computer 1 only':`Add Computer ${n} (${n+1} total players)`;select.append(option)}
    select.value=String(room.ai_players.length);
    select.onchange=async()=>{select.disabled=true;try{await request(`/api/rooms/${currentRoom}/set-ai-count`,{count:Number(select.value)})}catch(e){showError(e.message);select.disabled=false}};
    label.append(select);lobbyAi.append(label);
    const diff=document.createElement('label');diff.className='ai-difficulty-label';diff.textContent='AI Difficulty: ';const d=document.createElement('select');d.setAttribute('aria-label','AI difficulty');for(const [value,title] of [['easy','Easy — Casual'],['normal','Normal — Balanced'],['hard','Hard — Strategic'],['aggressive','Aggressive — Competitive']]){const opt=document.createElement('option');opt.value=value;opt.textContent=title;d.append(opt)}d.value=room.difficulty||'normal';d.onchange=async()=>{try{await request(`/api/rooms/${currentRoom}/set-difficulty`,{difficulty:d.value})}catch(e){showError(e.message)}};diff.append(d);lobbyAi.append(diff);
  }
  $('start-game').classList.toggle('hidden', currentPlayer !== room.host || room.started);
  $('game-end').classList.toggle('hidden', currentPlayer !== room.host);
  $('start-game').disabled = room.players.length < 2;
  document.querySelector('.waiting-message').textContent = room.started ? '> GAME STARTED - LOADING BOARD...' : `> ${room.players.length} PLAYER(S) CONNECTED - WAITING...`;
  if (room.started) { showScreen('game-screen'); renderGame(room); }
  else { showScreen('lobby-screen'); }
}
const RESOURCE_LABELS = [['wood','🌲','Wood'],['brick','🧱','Brick'],
  ['wheat','🌾','Wheat'],['wool','🐑','Wool'],['ore','⛰️','Ore']];
function renderInventory(room) {
  const container = $('inventory');
  container.replaceChildren();
  const inventory = room.my_inventory || {};
  if (room.spectator && room.all_inventories) {
    for (const [player, hand] of Object.entries(room.all_inventories)) {
      const card=document.createElement('div');card.className='inventory-card spectator-hand';
      const title=document.createElement('strong');title.textContent=player;card.append(title);
      for (const [key, icon, name] of RESOURCE_LABELS) { const line=document.createElement('small');line.textContent=`${icon} ${name}: ${hand[key]||0}`;card.append(line); }
      container.append(card);
    }
    $('inventory-total').textContent='Spectator view · All players’ inventories';return;
  }
  let total = 0;
  for (const [key, icon, name] of RESOURCE_LABELS) {
    const amount = Number(inventory[key] || 0); total += amount;
    const card = document.createElement('div'); card.className = 'inventory-card';
    const picture = document.createElement('span'); picture.textContent = icon;
    const label = document.createElement('small'); label.textContent = name;
    const number = document.createElement('strong'); number.textContent = amount;
    card.append(picture, label, number); container.append(card);
  }
  $('inventory-total').textContent = `Total cards: ${total} · Your cards are private`;
}
function renderPlayers(room) {
  const body = $('game-players'); body.replaceChildren();
  const seven = room.last_roll && room.last_roll.reduce((a,b)=>a+b,0) === 7;
  $('last-column-head').textContent = seven ? 'Cards' : 'Connection';
  room.players.forEach(player => {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    if (player === room.current_player) { const star = document.createElement('span'); star.className='star'; star.textContent='★ '; cell.append(star); }
    const color = document.createElement('span'); color.className='color-square '+room.colors[player]; cell.append(color);
    const name = document.createElement('span'); name.textContent=player+(player===room.host?' (HOST)':''); cell.append(name); row.append(cell);
    for (const val of [room.turns_taken[player], room.victory_points[player]]) { const td=document.createElement('td'); td.textContent=val; row.append(td); }
    const status=document.createElement('td');
    if (seven) status.textContent=room.resource_counts[player] + (room.resource_counts[player]>7?' ⚠':'');
    else { const dot=document.createElement('span'); dot.className=room.connected[player]?'online':'offline'; dot.textContent='● '; status.append(dot); status.append(document.createTextNode(room.connected[player]?(player===currentPlayer&&pingMs!==null?`${pingMs} ms`:'Online'):'Offline')); }
    row.append(status); body.append(row);
  });
}
let lastAnnouncedTurn = null;
let turnNoticeTimer = null;
function announceTurn(room) {
  if (room.phase === 'finished') return;
  const key = `${room.phase}|${room.current_player}|${room.phase==='setup'?room.setup_index:room.turn_number}`;
  if (key === lastAnnouncedTurn) return;
  lastAnnouncedTurn = key;
  const existing = document.getElementById('turn-announcement');
  if (existing) existing.remove();
  if (turnNoticeTimer) clearTimeout(turnNoticeTimer);
  const notice = document.createElement('section');
  notice.id = 'turn-announcement';
  notice.className = 'turn-announcement';
  notice.setAttribute('role','status');
  const phase = room.phase === 'setup' ? `Setup Phase · ${room.setup_step === 'road' ? 'Place Road' : 'Place Settlement'}` : 'Main Game';
  notice.innerHTML = '<div class="help-titlebar"><strong>▣ CURRENT TURN</strong><button type="button" class="help-close" aria-label="Dismiss turn announcement">×</button></div><div class="turn-announcement-body"></div>';
  const body = notice.querySelector('.turn-announcement-body');
  for (const [label,value] of [['Player',room.current_player + (room.current_player===room.host?' (HOST)':'')],['Turn',String(room.turn_number)],['Phase',phase]]) {
    const line = document.createElement('div');
    const heading = document.createElement('strong');heading.textContent=label+': ';
    line.append(heading,document.createTextNode(value));body.append(line);
  }
  document.body.append(notice);
  const dismiss=()=>{if(notice.isConnected)notice.remove();};
  notice.querySelector('button').onclick=dismiss;
  turnNoticeTimer=setTimeout(dismiss,2600);
}
function renderGame(room) {
  updateVictoryScreen(room);
  renderPlayers(room);
  renderInventory(room);
  if(room.ai_trade_offer) showAiOffer(room.ai_trade_offer);
  renderTerrainBoard(room.board);
  renderBuildOverlay(room);
  $('current-player').textContent = room.current_player + (room.current_player===room.host?' (HOST)':'');
  $('turn-info').textContent = room.phase === 'setup' ? `Setup ${room.setup_index + 1}/${room.players.length * 2}` : `Turn ${room.turn_number}`;
  announceTurn(room);
  $('dice-result').textContent = room.last_roll ? room.last_roll.join(' + ') : '⚄ ⚄';
  const myTurn = !isSpectator && room.current_player === currentPlayer;
  $('roll-dice').disabled = room.phase === 'setup' || !myTurn || room.rolled;
  $('end-turn').disabled = room.phase === 'setup' || !myTurn || !room.rolled || !!room.robber_pending;
  $('longest-road').textContent = room.road_owner || 'Not awarded';
  $('largest-army').textContent = room.army_owner || 'Not awarded';
  $('knight-count').textContent = 'Knights: '+(room.knights?.[currentPlayer]||0)+' · Played: '+(room.knights_played?.[currentPlayer]||0);
  const canKnight=room.phase==='play'&&myTurn&&room.rolled&&!room.winner&&!room.robber_pending;
  $('knight-buy').disabled=!canKnight||!['wheat','wool','ore'].every(k=>(room.my_inventory?.[k]||0)>=1);
  $('knight-play').disabled=!canKnight||!(room.knights?.[currentPlayer]>0)||room.knight_used_turn?.[currentPlayer]===room.turn_number||room.knight_bought_turn?.[currentPlayer]===room.turn_number;
  renderRobberChoice(room);
  const log = $('game-log');
  const wasAtBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 25;
  log.replaceChildren();
  room.log.forEach(item => { const line=document.createElement('div'); const time=document.createElement('time'); time.textContent='['+item.time+']'; line.append(time,document.createTextNode(item.message)); log.append(line); });
  if (wasAtBottom) log.scrollTop=log.scrollHeight;
}
async function request(path, body) {
  const response = await fetch(path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  const data=await response.json(); if (!data.success) throw new Error(data.error||'Request failed'); return data;
}
async function perform(button, fn) {
  button.disabled=true;
  try { await fn(); } catch (error) { showError(error.message); console.error(error); }
  finally { button.disabled=false; }
}
$('create-room').onclick=()=>perform($('create-room'),async()=>{
  const name=$('create-name').value.trim(); if (!name) { $('create-name').focus(); throw new Error('Please enter your player name before creating or joining a room.'); }
  const data=await request('/api/rooms',{player_name:name}); showLobby(data.room_code,data.player_name,data.token);
});
$('spectate-room').onclick=()=>perform($('spectate-room'),async()=>{
  const name=$('join-name').value.trim(),code=$('room-code').value.trim().toUpperCase();
  if (!name||!code) { $(name?'room-code':'join-name').focus(); throw new Error(name?'Please enter a room code.':'Please enter your player name before creating or joining a room.'); }
  const data=await request(`/api/rooms/${encodeURIComponent(code)}/spectate`,{player_name:name});
  showLobby(data.room_code,data.player_name,data.token,true);
});
$('join-room').onclick=()=>perform($('join-room'),async()=>{
  const name=$('join-name').value.trim(),code=$('room-code').value.trim().toUpperCase();
  if (!name||!code) { $(name?'room-code':'join-name').focus(); throw new Error(name?'Please enter a room code.':'Please enter your player name before creating or joining a room.'); }
  const data=await request(`/api/rooms/${encodeURIComponent(code)}/join`,{player_name:name}); showLobby(data.room_code,data.player_name,data.token);
});
$('start-game').onclick=()=>perform($('start-game'),async()=>{ showConnection('Generating island and starting game...'); try { await request(`/api/rooms/${currentRoom}/start`,{token:playerToken}); } catch(e) { hideConnection(); throw e; } });
$('roll-dice').onclick=()=>perform($('roll-dice'),()=>request(`/api/rooms/${currentRoom}/roll`,{token:playerToken}));
$('knight-buy').onclick=()=>perform($('knight-buy'),()=>request(`/api/rooms/${currentRoom}/knight-buy`,{}));
$('knight-play').onclick=()=>perform($('knight-play'),()=>request(`/api/rooms/${currentRoom}/knight-play`,{}));
$('end-turn').onclick=()=>perform($('end-turn'),()=>request(`/api/rooms/${currentRoom}/end-turn`,{token:playerToken}));
document.querySelectorAll('[data-placeholder]').forEach(button=>button.onclick=()=>showNotice('COMING SOON',button.dataset.placeholder+' is coming in a future update.'));


// v0.3: per-browser display settings (no multiplayer state changes)
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.body.classList.toggle('dark-theme', dark);
  localStorage.setItem('pentagon-theme', dark ? 'dark' : 'light');
}
applyTheme(localStorage.getItem('pentagon-theme') || 'light');
const viewToggle = $('view-menu-toggle');
const viewDropdown = $('view-dropdown');
viewToggle.addEventListener('click', () => {
  const open = viewDropdown.classList.toggle('hidden') === false;
  viewToggle.setAttribute('aria-expanded', String(open));
});
$('theme-light').addEventListener('click', () => { applyTheme('light'); viewDropdown.classList.add('hidden'); viewToggle.setAttribute('aria-expanded', 'false'); });
$('theme-dark').addEventListener('click', () => { applyTheme('dark'); viewDropdown.classList.add('hidden'); viewToggle.setAttribute('aria-expanded', 'false'); });
document.addEventListener('click', event => {
  if (!event.target.closest('.view-menu')) { viewDropdown.classList.add('hidden'); viewToggle.setAttribute('aria-expanded', 'false'); }
});

// v0.5 construction overlay: coordinates refer to the existing 917 x 760 map.
// These are prototype clickable build sites, not yet the final resource/adjacency rules.
let V = [];
let E = [];
fetch('/api/board-geometry').then(r=>r.json()).then(g=>{V=g.vertices;E=g.edges;window.PENTAGON_HEX_VERTICES=g.hex_vertices;if(latestRoom&&latestRoom.started)renderBuildOverlay(latestRoom);}).catch(console.error);
let buildMode = null;
const overlay = $('build-overlay');
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key,value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}
function renderBuildOverlay(room) {
  overlay.replaceChildren();
  if (!V.length || !E.length) return;
  const myTurn = !isSpectator && room.started && room.current_player === currentPlayer;
  const setup = room.phase === 'setup';
  // Setup advances automatically: settlement -> road -> next player.
  if (setup) buildMode = myTurn ? room.setup_step : null;
  if (!myTurn || (!setup && !room.rolled)) buildMode = null;
  const valid = new Set(myTurn && buildMode ? (room.valid_builds?.[buildMode] || []) : []);
  for (let i=0;i<E.length;i++) {
    const [a,b] = E[i], [x1,y1]=V[a], [x2,y2]=V[b], owner=room.roads['e'+i];
    const selectable = buildMode==='road' && valid.has('e'+i);
    const line=svgEl('line',{x1,y1,x2,y2,'class':owner?'built-road':'build-edge'+(selectable?' available':'')});
    if(owner) line.setAttribute('stroke', room.colors[owner] || 'white');
    if(selectable) line.addEventListener('click',()=>placeBuild('road','e'+i));
    overlay.append(line);
  }
  for(let i=0;i<V.length;i++) {
    const [cx,cy]=V[i], owner=room.buildings['v'+i];
    const selectable = (buildMode==='settlement' || buildMode==='city') && valid.has('v'+i);
    const city = room.cities?.includes('v'+i);
    const circle=svgEl('circle',{cx,cy,r:city?16:owner?12:10,'class':owner?'built-settlement'+(selectable?' available':''):'build-vertex'+(selectable?' available':'')});
    if(owner) circle.setAttribute('fill',room.colors[owner]||'white');
    if(city) circle.setAttribute('stroke-width','5');
    if(selectable) { circle.style.pointerEvents='all'; circle.style.cursor='pointer'; circle.setAttribute('stroke','#ffe75b'); circle.setAttribute('stroke-width','6'); circle.addEventListener('click',()=>placeBuild(buildMode,'v'+i)); }
    overlay.append(circle);
  }
  $('build-road').disabled=!myTurn || setup || !room.rolled || !(room.valid_builds?.road?.length);
  $('build-settlement').disabled=!myTurn || setup || !room.rolled || !(room.valid_builds?.settlement?.length);
  $('build-city').disabled=!myTurn || setup || !room.rolled || !(room.valid_builds?.city?.length);
  $('build-road').classList.toggle('selected',buildMode==='road');
  $('build-settlement').classList.toggle('selected',buildMode==='settlement');
  $('build-city').classList.toggle('selected',buildMode==='city');
  $('build-hint').textContent = setup
    ? (myTurn ? `Setup: click a highlighted ${room.setup_step === 'road' ? 'edge' : 'intersection'} to place your ${room.setup_step}.` : `Setup: waiting for ${room.current_player}.`)
    : !myTurn ? `Waiting for ${room.current_player}'s turn.`
    : !room.rolled ? 'Roll the dice before building.'
    : buildMode ? `Click a highlighted ${buildMode==='road'?'edge':'intersection'} to build.`
    : 'Select Build Road, Settlement, or City to show legal spots.';
}
async function placeBuild(kind, location) {
  try { await request(`/api/rooms/${currentRoom}/build`,{token:playerToken,kind,location}); }
  catch(error) { showError(error.message); }
}
for (const [id,kind] of [['build-road','road'],['build-settlement','settlement'],['build-city','city']]) {
  $(id).onclick=()=>{ if(!latestRoom || latestRoom.phase==='setup')return; buildMode=buildMode===kind?null:kind; renderBuildOverlay(latestRoom); };
}

// v0.6.1: original island base + 19 independently randomized hex textures.
// Board state is owned by the Python server, shared through WebSockets.
const BOARD_R=70;
const TEXTURES=['forest','wheat','pasture','hills','mountain','desert'];
const TERRAIN_TINT={forest:'#27623b',wheat:'#c49b26',pasture:'#5b963e',hills:'#b55d31',mountain:'#6d7682',desert:'#d3b67d'};
function hexCenter(tile) {
  const counts=[3,4,5,4,3];
  return [450+(tile.col-(counts[tile.row]-1)/2)*Math.sqrt(3)*BOARD_R,170+tile.row*1.5*BOARD_R];
}
function hexPoints(cx,cy) {
  return Array.from({length:6},(_,k)=>{const a=(-90+60*k)*Math.PI/180;return [cx+BOARD_R*Math.cos(a),cy+BOARD_R*Math.sin(a)];});
}
function renderTerrainBoard(board) {
  if(!board) return;
  const svg=$('terrain-board');
  if(svg.dataset.seed===String(board.seed)&&svg.dataset.robber===String(latestRoom?.robber_tile))return;
  svg.dataset.robber=String(latestRoom?.robber_tile);
  svg.dataset.seed=String(board.seed);
  svg.replaceChildren();
  const defs=svgEl('defs',{});
  for(const type of TEXTURES) {
    const pattern=svgEl('pattern',{id:'tile-'+type,patternUnits:'userSpaceOnUse',width:180,height:180});
    pattern.append(svgEl('image',{href:'static/img/terrain-'+type+'.jpg',x:0,y:0,width:180,height:180,preserveAspectRatio:'xMidYMid slice'}));
    defs.append(pattern);
  }
  svg.append(defs);
  svg.append(svgEl('image',{href:'static/img/island-base.png',x:0,y:0,width:900,height:781,preserveAspectRatio:'none'}));
  for(const tile of board.tiles) {
    const [cx,cy]=hexCenter(tile);
    const points=hexPoints(cx,cy).map(p=>p.join(',')).join(' ');
    // Individual hex shapes: background artwork remains independent.
    const tileGroup=svgEl('g',{'class':'hex-cell'});
    tileGroup.append(svgEl('polygon',{points,fill:TERRAIN_TINT[tile.terrain],opacity:.95}));
    // Image texture clipped exactly to each hexagon (no baked terrain layout).
    const clipId='hex-clip-'+tile.id;
    const clip=svgEl('clipPath',{id:clipId});clip.append(svgEl('polygon',{points}));defs.append(clip);
    tileGroup.append(svgEl('image',{href:'static/img/terrain-'+tile.terrain+'.jpg',x:cx-BOARD_R*1.05,y:cy-BOARD_R,width:BOARD_R*2.1,height:BOARD_R*2,preserveAspectRatio:'xMidYMid slice','clip-path':'url(#'+clipId+')'}));
    tileGroup.append(svgEl('polygon',{points,'class':'hex-rim'}));
    if(tile.number!==null) {
      tileGroup.append(svgEl('circle',{cx,cy,r:21,'class':'tile-number'}));
      const label=svgEl('text',{x:cx,y:cy+1,'class':'tile-number-text'+([6,8].includes(tile.number)?' hot':'')});label.textContent=tile.number;tileGroup.append(label);
    } else {
      tileGroup.append(svgEl('circle',{cx,cy,r:20,'class':'tile-number'}));
      const label=svgEl('text',{x:cx,y:cy+1,'class':'tile-number-text'});label.textContent='';tileGroup.append(label);
    }
    if(latestRoom?.robber_tile===Number(tile.id.slice(1))){const marker=svgEl('text',{x:cx+28,y:cy-24,'class':'robber-marker'});marker.textContent='♟';tileGroup.append(marker)}
    svg.append(tileGroup);
  }
  // Keep board.seed for synchronization; do not display it on the map.
}


// v0.6.4: independent draggable Help windows; client-only, no game-state changes.
const helpTopics = {
  intro: {title:'How to Play', html:`<h2>Getting Started</h2><p>Pentagon Island is a multiplayer island strategy game. Build settlements and roads, collect resources, and earn victory points.</p><ol><li>Create a room and share its six-character code.</li><li>Once everyone joins, the host starts the game.</li><li>During setup, place a settlement and its connecting road. Each player does this twice in snake order.</li><li>During normal turns, roll the dice, collect resources, build, then end your turn.</li></ol><p>Only legal construction locations are highlighted for the active player.</p>`},
  building: {title:'Building Rules', html:`<h2>Construction</h2><p><b>Road:</b> 1 Wood + 1 Brick. Connect it to your own road or settlement. Opposing roads may meet at empty intersections, but enemy settlements block extension through their vertices.</p><p><b>Settlement:</b> 1 Wood + 1 Brick + 1 Wheat + 1 Wool. Must connect to your road after setup. No settlement may be placed on a vertex directly adjacent to another settlement or city, regardless of owner.</p><p><b>City:</b> 2 Wheat + 3 Ore. Upgrade one of your own settlements; cities produce double resources and are worth 2 VP total.</p><p>The first two settlements and their connecting roads are free during setup.</p>`},
  resources: {title:'Resources & Trading', html:`<h2>Resources</h2><p>Forest produces Wood; Hills produce Brick; Wheat fields produce Wheat; Pasture produces Wool; Mountains produce Ore. Desert produces nothing.</p><p>When a number is rolled, settlements touching tiles with that number collect 1 resource; cities collect 2. Your Inventory shows your private resource counts.</p><h3>Trading with AI</h3><p>On your turn, roll the dice, then choose Trade and select Computer 1, 2 or 3 as your trading partner. Use the + and − buttons to select resources you offer and request, and submit your proposal. An AI opponent may accept your original offer immediately, decline, or suggest a counteroffer. Choose Yes to accept a counteroffer or No to decline; a declined trade closes automatically.</p><p>AI opponents may also offer a trade after seven of their own turns without building a road or settlement, if they have resources to exchange. You can accept or decline those offers. AI difficulty is selected in the lobby: Easy, Normal, Hard or Aggressive. Bank and port trading are not implemented.</p>`},
  dice: {title:'Dice & Turns', html:`<h2>Taking a Turn</h2><ol><li>When your turn begins, roll two dice.</li><li>Matching terrain tiles produce resources for all eligible players.</li><li>Use your resources to build roads, settlements, or cities.</li><li>Choose End Turn to pass play to the next player.</li></ol><p>Rolling a 7 makes players with more than seven resources discard half, then lets the roller move the robber to another tile and steal a random card from an adjacent opponent. A robber tile produces no resources. Playing a Knight also moves the robber, but does not force discards.</p>`},
  victory: {title:'Victory Points', html:`<h2>Victory Points</h2><p>Players begin with 0 VP before setup.</p><ul><li>Settlement: 1 VP</li><li>City: 2 VP total (replaces the settlement's 1 VP)</li><li>Longest Road: 2 VP for a continuous road of at least 5 pieces</li><li>Largest Army: 2 VP after playing at least 3 Knights (another player must exceed the holder to take it)</li></ul><p>The first player to reach 10 VP wins. Longest Road requires at least 5 connected road pieces. A tied leader retains the award; Largest Army counts played Knights, not unplayed cards. Buy a Knight for 1 wheat, 1 wool and 1 ore; it cannot be played on the same turn it was bought. Only one Knight can be played per turn.</p>`},
  controls: {title:'Controls', html:`<h2>Controls</h2><ul><li><b>Create Game:</b> enter a name to host a room.</li><li><b>Join Game:</b> enter your name and room code.</li><li><b>Roll Dice:</b> roll at the start of your normal turn.</li><li><b>Build Road / Settlement / City:</b> select the action, then click a highlighted legal position.</li><li><b>End Turn:</b> hand the turn to the next player.</li><li><b>View:</b> switch between light and dark themes.</li><li><b>Help:</b> open multiple draggable help windows.</li></ul><p>Drag a help window by its title bar. Use its close button to dismiss it.</p>`},
  about: {title:'About Pentagon Island', html:`<h2>PENTAGON ISLAND</h2><p>Multiplayer Strategy Game</p><p><strong>Jonathan Lachman's Project: 2026</strong></p><p>Version 0.8.1 (lobby, controls and robber marker refinements)</p><p>A browser-based multiplayer strategy game inspired by Catan, featuring randomized islands, resource collection, and settlement building.</p>`}
};
const helpToggle = $('help-menu-toggle');
const helpDropdown = $('help-dropdown');
let helpTopZ = 500;
let helpWindowCount = 0;
helpToggle.addEventListener('click', event => {
  event.stopPropagation();
  const isOpen = helpDropdown.classList.toggle('hidden') === false;
  helpToggle.setAttribute('aria-expanded', String(isOpen));
  viewDropdown.classList.add('hidden'); viewToggle.setAttribute('aria-expanded','false');
});
document.querySelectorAll('[data-help]').forEach(button => button.addEventListener('click', () => {
  openHelpWindow(button.dataset.help);
  helpDropdown.classList.add('hidden'); helpToggle.setAttribute('aria-expanded','false');
}));
document.addEventListener('click', event => {
  if (!event.target.closest('.help-menu')) {
    helpDropdown.classList.add('hidden'); helpToggle.setAttribute('aria-expanded','false');
  }
});
function openHelpWindow(topicId) {
  const topic = helpTopics[topicId]; if (!topic) return;
  const layer = $('help-window-layer');
  const win = document.createElement('section');
  win.className = 'help-window'; win.setAttribute('role','dialog');
  win.setAttribute('aria-label',topic.title);
  win.style.zIndex = String(++helpTopZ);
  const offset = (helpWindowCount++ % 7) * 24;
  win.style.left = `${Math.max(8,Math.min(window.innerWidth-340,90+offset))}px`;
  win.style.top = `${Math.max(8,Math.min(window.innerHeight-200,100+offset))}px`;
  win.innerHTML = `<div class="help-titlebar"><strong>▣ ${topic.title.toUpperCase()}</strong><button type="button" class="help-close" aria-label="Close ${topic.title}">×</button></div><div class="help-content">${topic.html}</div><div class="help-status">PENTAGON ISLAND · HELP v0.6.5</div>`;
  layer.appendChild(win);
  win.querySelector('.help-close').addEventListener('click',()=>win.remove());
  win.addEventListener('pointerdown',()=>{win.style.zIndex=String(++helpTopZ);});
  const bar = win.querySelector('.help-titlebar');
  bar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    const originX = event.clientX, originY = event.clientY;
    const startX = win.offsetLeft, startY = win.offsetTop;
    bar.setPointerCapture(event.pointerId);
    const move = e => {
      const maxX = Math.max(0, window.innerWidth - Math.min(win.offsetWidth,80));
      const maxY = Math.max(0, window.innerHeight - 40);
      win.style.left = `${Math.max(0,Math.min(maxX,startX+e.clientX-originX))}px`;
      win.style.top = `${Math.max(0,Math.min(maxY,startY+e.clientY-originY))}px`;
    };
    const stop = () => {bar.removeEventListener('pointermove',move);bar.removeEventListener('pointerup',stop);bar.removeEventListener('pointercancel',stop);};
    bar.addEventListener('pointermove',move);bar.addEventListener('pointerup',stop);bar.addEventListener('pointercancel',stop);
  });
}

// v0.6.5 Game and Multiplayer menus. Server authorizes every state-changing action.
function returnHome() {
  if (socket) { const old=socket;socket=null;old.close(); }
  currentRoom=null;currentPlayer=null;playerToken=null;latestRoom=null;isSpectator=false;
  buildMode=null;pingMs=null;pingSent.clear();
  $('footer-room').textContent='';
  hideConnection();
  document.querySelectorAll('.help-window').forEach(w=>w.remove());
  $('game-end').classList.add('hidden');
  showScreen('home-screen');
}
function showNotice(title, message, afterClose) {
  return new Promise(resolve => {
    const layer=$('dialog-layer');
    $('confirm-title').textContent=title;
    $('confirm-message').textContent=message;
    const buttons=$('confirm-buttons'); buttons.replaceChildren();
    const ok=document.createElement('button'); ok.type='button'; ok.textContent='OK';
    ok.onclick=()=>{layer.classList.add('hidden'); if(afterClose)afterClose(); resolve();};
    buttons.append(ok); layer.classList.remove('hidden'); ok.focus();
  });
}
function showError(message) {
  const msg=String(message||'An unexpected error occurred.');
  let title='ACTION FAILED';
  if(/name required|enter your player name|enter your name/i.test(msg))title='PLAYER NAME REQUIRED';
  else if(/room code/i.test(msg))title='ROOM CODE REQUIRED';
  else if(/spectat/i.test(msg))title='SPECTATOR ERROR';
  else if(/host|permission|unauthorized|forbidden/i.test(msg))title='PERMISSION DENIED';
  else if(/room|join|full|already taken|started/i.test(msg))title='UNABLE TO JOIN ROOM';
  else if(/network|fetch|server|connect/i.test(msg))title='CONNECTION ERROR';
  return showNotice(title,msg);
}
function showConfirm(title,message,choices) {
  return new Promise(resolve=>{
    const layer=$('dialog-layer');
    $('confirm-title').textContent=title;
    $('confirm-message').textContent=message;
    const buttons=$('confirm-buttons');buttons.replaceChildren();
    for (const [label,value] of choices) {
      const b=document.createElement('button');b.type='button';b.textContent=label;
      b.addEventListener('click',()=>{layer.classList.add('hidden');resolve(value);});
      buttons.append(b);
    }
    layer.classList.remove('hidden');
  });
}
async function leaveGame() {
  if (!currentRoom) {returnHome();return;}
  if (getHost() && latestRoom.started) {
    const choice=await showConfirm('CLOSE GAME','Leave the current match (host transfers) or end it for everyone?', [['Cancel','cancel'],['Leave','leave'],['End Session','end']]);
    if (choice==='end') await endSession();
    if (choice==='leave') { try {await request(`/api/rooms/${currentRoom}/leave`,{token:playerToken});returnHome();} catch(e){showError(e.message);} }
    return;
  }
  const answer=await showConfirm('LEAVE GAME','Return to the main menu?', [['No',false],['Yes',true]]);
  if (!answer) return;
  try {await request(`/api/rooms/${currentRoom}/leave`,{token:playerToken});returnHome();}
  catch(e){showError(e.message);}
}
async function endSession() {
  if (!getHost()) return showNotice('PERMISSION DENIED','Only the host can end the session.');
  const yes=await showConfirm('END SESSION','Are you sure? All players and spectators will return to the main menu.',[['No',false],['Yes',true]]);
  if (!yes) return;
  try {await request(`/api/rooms/${currentRoom}/end-session`,{token:playerToken});returnHome();}
  catch(e){showError(e.message);}
}
function setupDropdown(toggleId,menuId,containerClass) {
  const toggle=$(toggleId),menu=$(menuId);
  toggle.addEventListener('click',e=>{
    e.stopPropagation();
    document.querySelectorAll('.view-dropdown,.help-dropdown').forEach(d=>{if(d!==menu)d.classList.add('hidden');});
    menu.classList.toggle('hidden');
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.'+containerClass))menu.classList.add('hidden');});
}
setupDropdown('game-menu-toggle','game-dropdown','game-menu');
setupDropdown('multiplayer-menu-toggle','multiplayer-dropdown','multiplayer-menu');
$('game-leave').onclick=()=>{$('game-dropdown').classList.add('hidden');leaveGame();};
$('game-end').classList.add('hidden');
$('game-end').onclick=()=>{$('game-dropdown').classList.add('hidden');endSession();};
$('app-close').onclick=()=>leaveGame();
function openLobbySettings() {
  if(!latestRoom||!currentRoom)return showNotice('NO ACTIVE ROOM','You must create or join a room before using this feature.');
  const host=getHost();
  const room=latestRoom;
  const win=document.createElement('section');win.className='help-window';win.setAttribute('role','dialog');
  win.style.zIndex=String(++helpTopZ);win.style.left='min(110px, 8vw)';win.style.top='min(120px, 8vh)';
  win.innerHTML='<div class="help-titlebar"><strong>▣ MULTIPLAYER — LOBBY SETTINGS</strong><button class="help-close" type="button">×</button></div><div class="help-content lobby-settings-content"></div><div class="help-status">PENTAGON ISLAND · v0.6.5</div>';
  const content=win.querySelector('.help-content');
  const heading=document.createElement('h2');heading.textContent='ROOM '+currentRoom;content.append(heading);
  const status=document.createElement('p');status.textContent=host?'Host controls enabled':'Read-only settings';content.append(status);
  if(host&&!room.started){
    const label=document.createElement('label');label.className='ai-count-label';label.textContent='Add AI player: ';
    const select=document.createElement('select');select.setAttribute('aria-label','AI opponents');
    for(let n=1;n<=3;n++){const opt=document.createElement('option');opt.value=n;opt.textContent=n===1?'1 AI':`${n} AI (${n+1} total players)`;select.append(opt)}
    select.value=String(room.ai_players.length);
    select.onchange=async()=>{try{await request(`/api/rooms/${currentRoom}/set-ai-count`,{count:Number(select.value)});win.remove();openLobbySettings()}catch(e){showError(e.message)}};
    label.append(select);content.append(label);
  }
  const players=document.createElement('h3');players.textContent='Players & Spectators';content.append(players);
  for(const name of [...room.players,...(room.spectators||[])]) {
    const row=document.createElement('div');row.className='settings-member';
    const label=document.createElement('span');label.textContent=name+(name===room.host?' [HOST]':(room.spectators||[]).includes(name)?' [SPECTATOR]':'');row.append(label);
    if(host && name!==room.host && !room.started && room.ai_players.length>1) {
      const kick=document.createElement('button');kick.type='button';kick.textContent='Kick';
      kick.onclick=async()=>{
        const yes=await showConfirm('KICK MEMBER',`Remove ${name} from the room?`,[['No',false],['Yes',true]]);
        if(!yes)return;
        try{await request(`/api/rooms/${currentRoom}/kick`,{token:playerToken,player_name:name});win.remove();}
        catch(e){showError(e.message);}
      };row.append(kick);
    }
    content.append(row);

  }
  if(host&&!room.started){const diff=document.createElement('label');diff.className='ai-difficulty-label';diff.textContent='AI Difficulty: ';const sel=document.createElement('select');for(const [value,title] of [['easy','Easy'],['normal','Normal'],['hard','Hard'],['aggressive','Aggressive']]){const opt=document.createElement('option');opt.value=value;opt.textContent=title;sel.append(opt)}sel.value=room.difficulty||'normal';sel.onchange=async()=>{try{await request(`/api/rooms/${currentRoom}/set-difficulty`,{difficulty:sel.value})}catch(e){showError(e.message)}};diff.append(sel);content.append(diff)}
  const board=document.createElement('h3');board.textContent='Board Settings';content.append(board);
  const reset=document.createElement('button');reset.textContent='Reset Board';reset.disabled=!host;
  reset.onclick=async()=>{
    const yes=await showConfirm('RESET BOARD','Reset the board and scores for everyone? Players and spectators stay connected.',[['No',false],['Yes',true]]);
    if(!yes)return;
    try{showConnection('Resetting and synchronizing island...');await request(`/api/rooms/${currentRoom}/reset`,{token:playerToken});win.remove();}catch(e){hideConnection();showError(e.message);}
  };content.append(reset);

  $('help-window-layer').append(win);
  win.querySelector('.help-close').onclick=()=>win.remove();
  win.addEventListener('pointerdown',()=>win.style.zIndex=String(++helpTopZ));
  const bar=win.querySelector('.help-titlebar');
  bar.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('button'))return;
    const sx=e.clientX,sy=e.clientY,l=win.offsetLeft,t=win.offsetTop;
    bar.setPointerCapture(e.pointerId);
    const move=ev=>{win.style.left=Math.max(0,l+ev.clientX-sx)+'px';win.style.top=Math.max(0,t+ev.clientY-sy)+'px';};
    const stop=()=>{bar.removeEventListener('pointermove',move);bar.removeEventListener('pointerup',stop);bar.removeEventListener('pointercancel',stop);};
    bar.addEventListener('pointermove',move);bar.addEventListener('pointerup',stop);bar.addEventListener('pointercancel',stop);
  });
}
$('lobby-settings-open').onclick=()=>{$('multiplayer-dropdown').classList.add('hidden');openLobbySettings();};

// v0.6.7: Connection status uses the supplied animated globe asset.
function showConnection(message) {
  $('connection-status').textContent = message;
  $('connection-layer').classList.remove('hidden');
}
function hideConnection() { $('connection-layer').classList.add('hidden'); }

// Portfolio single-player demo victory screen. Only the human player sees "You Win".
let shownWinner = null;
function updateVictoryScreen(room) {
  const layer = $('victory-layer');
  if (!layer) return;
  const winner = room.winner || null;
  if (!winner) { shownWinner = null; layer.classList.add('hidden'); return; }
  if (shownWinner === winner) return;
  shownWinner = winner;
  const humanWon = winner === currentPlayer;
  $('victory-title').textContent = humanWon ? 'YOU WIN!' : 'GAME OVER';
  $('victory-message').textContent = humanWon
    ? 'You Win! You received 10 victory points.'
    : `Game Over, Player: ${winner}, received 10 victory points.`;
  $('victory-trophy').hidden = !humanWon;
  layer.classList.remove('hidden');
  ['roll-dice','end-turn','build-road','build-settlement','build-city'].forEach(id => { const button = $(id); if (button) button.disabled = true; });
}
$('victory-restart').addEventListener('click', () => {
  $('victory-layer').classList.add('hidden');
  shownWinner = null;
  location.reload();
});

// Portfolio host toolbar bridges to the original game menus.
if (new URLSearchParams(location.search).get('embedded') === '1') {
  document.body.classList.add('portfolio-embedded');
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.source !== 'pentagon-portfolio') return;
    if (event.data.command === 'theme' && ['light','dark'].includes(event.data.value)) {
      document.getElementById('theme-' + event.data.value)?.click();
    }
    if (event.data.command === 'game' && ['game-leave','game-end','lobby-settings-open'].includes(event.data.value)) {
      document.getElementById(event.data.value)?.click();
    }
    if (event.data.command === 'help') {
      const help = [...document.querySelectorAll('[data-help]')].find(b => b.dataset.help === event.data.value);
      help?.click();
    }
  });
}

/* Local AI trading: propose, counter, confirm. */
(()=>{
const layer=$('trade-layer'),give={},want={};let pending=null;const opponent=$('trade-opponent');
const clean=()=>{for(const [key] of RESOURCE_LABELS){give[key]=0;want[key]=0}pending=null;$('trade-counter').classList.add('hidden');$('trade-message').textContent='Choose what to give and what to request.';draw()};
function draw(){for(const [side,values] of [['trade-give',give],['trade-want',want]]){const target=$(side);target.replaceChildren();for(const [key,icon,name] of RESOURCE_LABELS){const row=document.createElement('div');row.className='trade-resource';const title=document.createElement('span');title.textContent=icon+' '+name;const controls=document.createElement('div');controls.className='trade-controls';const minus=document.createElement('button'),plus=document.createElement('button'),num=document.createElement('output');minus.type=plus.type='button';minus.textContent='−';plus.textContent='+';num.textContent=values[key];const limit=side==='trade-give'?Number(latestRoom?.my_inventory?.[key]||0):99;minus.disabled=values[key]===0;plus.disabled=values[key]>=limit;minus.onclick=()=>{values[key]--;pending=null;$('trade-counter').classList.add('hidden');draw()};plus.onclick=()=>{values[key]++;pending=null;$('trade-counter').classList.add('hidden');draw()};controls.append(minus,num,plus);row.append(title,controls);target.append(row)}}}
const close=()=>{layer.classList.add('hidden');pending=null};opponent.onchange=()=>{pending=null;$('trade-counter').classList.add('hidden');$('trade-title').textContent='↔ TRADE WITH '+opponent.value};$('trade-open').onclick=()=>{if(!latestRoom||latestRoom.phase!=='play'||latestRoom.current_player!==currentPlayer||!latestRoom.rolled||latestRoom.winner){showNotice('TRADE UNAVAILABLE','You can trade after rolling the dice on your turn.');return}clean();opponent.replaceChildren();for(const name of latestRoom.ai_players||[]){const option=document.createElement('option');option.value=name;option.textContent=name;opponent.append(option)}opponent.onchange();layer.classList.remove('hidden')};$('trade-close').onclick=close;layer.addEventListener('click',e=>{if(e.target===layer)close()});$('trade-reset').onclick=clean;
$('trade-propose').onclick=async()=>{try{const response=await request(`/api/rooms/${currentRoom}/trade-propose`,{token:playerToken,give,want,ai_player:opponent.value});if(response.unavailable){close();showNotice('TRADE DECLINED',response.message);return}if(response.accepted){await request(`/api/rooms/${currentRoom}/trade-accept`,{token:playerToken,give:response.give,want:response.want,ai_player:response.ai_player});close();showNotice('TRADE ACCEPTED',response.message);return}pending={give:response.give,want:response.want,ai_player:response.ai_player};$('trade-counter-message').textContent=response.message;$('trade-counter-details').textContent='You give: '+describe(pending.give)+'  |  You receive: '+describe(pending.want);$('trade-counter').classList.remove('hidden')}catch(e){showError(e.message)}};
function describe(inv){return RESOURCE_LABELS.filter(([k])=>inv[k]>0).map(([k,,name])=>`${inv[k]} ${name}`).join(', ')||'Nothing'}
$('trade-yes').onclick=async()=>{if(!pending)return;try{await request(`/api/rooms/${currentRoom}/trade-accept`,{token:playerToken,...pending});close()}catch(e){showError(e.message);$('trade-counter').classList.add('hidden');pending=null}};
$('trade-no').onclick=close;
})();

/* AI-initiated offers, starting after seven consecutive AI turns without a road or settlement. */
function showAiOffer(offer){
const layer=document.getElementById('ai-offer-layer');if(!layer||!layer.classList.contains('hidden'))return;
const describe=o=>RESOURCE_LABELS.filter(([k])=>o[k]>0).map(([k,,name])=>`${o[k]} ${name}`).join(', ');
document.getElementById('ai-offer-text').textContent=`${offer.ai_player||'Computer 1 (AI)'} offers ${describe(offer.want)} in exchange for your ${describe(offer.give)}. Agree to Trade?`;
layer.classList.remove('hidden');
}
async function answerAiOffer(accept){try{await request(`/api/rooms/${currentRoom}/ai-trade-respond`,{token:playerToken,accept});document.getElementById('ai-offer-layer').classList.add('hidden')}catch(e){showError(e.message)}}
document.getElementById('ai-offer-yes')?.addEventListener('click',()=>answerAiOffer(true));
document.getElementById('ai-offer-no')?.addEventListener('click',()=>answerAiOffer(false));

/* v0.8.0: interactive robber destination and victim selection. */
let robberSelection=null;
function renderRobberChoice(room){
 const layer=$('robber-layer');if(!layer)return;
 if(!room.robber_pending||room.robber_pending.player!==currentPlayer){layer.classList.add('hidden');robberSelection=null;return}
 layer.classList.remove('hidden');const tiles=$('robber-tiles'),victims=$('robber-victims');
 if(robberSelection===null||robberSelection===room.robber_tile){robberSelection=null;victims.replaceChildren()}
 tiles.replaceChildren();room.board.tiles.forEach((tile,i)=>{if(i===room.robber_tile)return;const btn=document.createElement('button');btn.type='button';btn.textContent=`${i+1}: ${tile.terrain} ${tile.number||'desert'}`;btn.className=i===robberSelection?'selected':'';btn.onclick=()=>{robberSelection=i;renderRobberChoice(room)};tiles.append(btn)});
 if(robberSelection===null)return;
 victims.replaceChildren();const affected=[...new Set((window.PENTAGON_HEX_VERTICES?.[robberSelection]||[]).map(v=>room.buildings['v'+v]).filter(p=>p&&p!==currentPlayer&&Object.values(room.resources[p]||{}).some(n=>n>0)))];
 const label=document.createElement('p');label.textContent=affected.length?'Select a player to steal from:':'No eligible opponent on this tile.';victims.append(label);
 const select=document.createElement('select');select.setAttribute('aria-label','Opponent to rob');for(const player of affected){const opt=document.createElement('option');opt.value=player;opt.textContent=player;select.append(opt)}if(affected.length)victims.append(select);
 const move=document.createElement('button');move.type='button';move.textContent='MOVE ROBBER';move.onclick=async()=>{try{await request(`/api/rooms/${currentRoom}/robber-move`,{tile:robberSelection,victim:affected.length?select.value:null});robberSelection=null}catch(e){showError(e.message)}};victims.append(move);
}
