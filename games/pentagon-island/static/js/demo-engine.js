/* Pentagon Island v0.8.0 source-based browser adapter.
   Original visuals and original frontend are preserved. This local engine ports
   setup/adjacency/cost/resource mechanics; AI decisions are browser-side adaptations. */
(()=>{'use strict';
const geometry={"vertices":[[328.756,100.0],[389.378,135.0],[389.378,205.0],[328.756,240.0],[268.135,205.0],[268.135,135.0],[450.0,100.0],[510.622,135.0],[510.622,205.0],[450.0,240.0],[571.244,100.0],[631.865,135.0],[631.865,205.0],[571.244,240.0],[328.756,310.0],[268.135,345.0],[207.513,310.0],[207.513,240.0],[450.0,310.0],[389.378,345.0],[571.244,310.0],[510.622,345.0],[692.487,240.0],[692.487,310.0],[631.865,345.0],[268.135,415.0],[207.513,450.0],[146.891,415.0],[146.891,345.0],[389.378,415.0],[328.756,450.0],[510.622,415.0],[450.0,450.0],[631.865,415.0],[571.244,450.0],[753.109,345.0],[753.109,415.0],[692.487,450.0],[328.756,520.0],[268.135,555.0],[207.513,520.0],[450.0,520.0],[389.378,555.0],[571.244,520.0],[510.622,555.0],[692.487,520.0],[631.865,555.0],[389.378,625.0],[328.756,660.0],[268.135,625.0],[510.622,625.0],[450.0,660.0],[631.865,625.0],[571.244,660.0]],"edges":[[0,1],[1,2],[2,3],[3,4],[4,5],[0,5],[6,7],[7,8],[8,9],[2,9],[1,6],[10,11],[11,12],[12,13],[8,13],[7,10],[3,14],[14,15],[15,16],[16,17],[4,17],[9,18],[18,19],[14,19],[13,20],[20,21],[18,21],[12,22],[22,23],[23,24],[20,24],[15,25],[25,26],[26,27],[27,28],[16,28],[19,29],[29,30],[25,30],[21,31],[31,32],[29,32],[24,33],[33,34],[31,34],[23,35],[35,36],[36,37],[33,37],[30,38],[38,39],[39,40],[26,40],[32,41],[41,42],[38,42],[34,43],[43,44],[41,44],[37,45],[45,46],[43,46],[42,47],[47,48],[48,49],[39,49],[44,50],[50,51],[47,51],[46,52],[52,53],[50,53]],"hex_vertices":[[0,1,2,3,4,5],[6,7,8,9,2,1],[10,11,12,13,8,7],[4,3,14,15,16,17],[2,9,18,19,14,3],[8,13,20,21,18,9],[12,22,23,24,20,13],[16,15,25,26,27,28],[14,19,29,30,25,15],[18,21,31,32,29,19],[20,24,33,34,31,21],[23,35,36,37,33,24],[25,30,38,39,40,26],[29,32,41,42,38,30],[31,34,43,44,41,32],[33,37,45,46,43,34],[38,42,47,48,49,39],[41,44,50,51,47,42],[43,46,52,53,50,44]]};
const V=geometry.vertices,E=geometry.edges,H=geometry.hex_vertices;
const terrains=['forest','forest','forest','forest','wheat','wheat','wheat','wheat','pasture','pasture','pasture','pasture','hills','hills','hills','mountain','mountain','mountain','desert'];
const nums=[2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];
const resource={forest:'wood',hills:'brick',wheat:'wheat',pasture:'wool',mountain:'ore'};
const costs={road:{wood:1,brick:1},settlement:{wood:1,brick:1,wheat:1,wool:1},city:{wheat:2,ore:3},knight:{wheat:1,wool:1,ore:1}};
const inventory=()=>({wood:0,brick:0,wheat:0,wool:0,ore:0});
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
let room=null,ws=null,seq=0,aiBusy=false;
const VICTORY_TARGET=10;
function makeBoard(){const ts=shuffle([...terrains]);const ns=shuffle([...nums]);let n=0;return {seed:++seq,mode:'balanced',tiles:ts.map((terrain,i)=>({id:'t'+i,row:[0,0,0,1,1,1,1,2,2,2,2,2,3,3,3,3,4,4,4][i],col:[0,1,2,0,1,2,3,0,1,2,3,4,0,1,2,3,0,1,2][i],terrain,number:terrain==='desert'?null:ns[n++]}))}}
function note(message){room.log.push({time:new Date().toLocaleTimeString('en-GB',{hour12:false}),message});room.log=room.log.slice(-100)}
function startRoom(name){room={host:name,players:[name],ai_players:[],started:false,turn_index:0,turn_number:1,rolled:false,last_roll:null,victory_points:{[name]:0},turns_taken:{[name]:0},resources:{[name]:inventory()},log:[],road_owner:null,army_owner:null,buildings:{},roads:{},cities:[],board:makeBoard(),phase:'lobby',setup_order:[],setup_index:0,setup_step:'settlement',setup_vertex:null,winner:null,ai_trade_offer:null,ai_last_trade_turn:{},ai_stalled_turns:{},difficulty:'normal',knights:{[name]:0},knights_played:{[name]:0},knight_bought_turn:{},knight_used_turn:{},robber_tile:18,robber_pending:null};room.robber_tile=room.board.tiles.findIndex(t=>t.terrain==='desert');setAiCount(1);note(name+' started a single-player demo.');return {success:true,room_code:'DEMO01',player_name:name,token:'browser-demo-token'}}
function setAiCount(count){if(room.started)throw Error('Change AI players before starting the game.');if(!Number.isInteger(count)||count<1||count>3)throw Error('Choose 1 to 3 AI opponents.');const ai=Array.from({length:count},(_,i)=>`Computer ${i+1} (AI)`);room.players=[room.host,...ai];room.ai_players=ai;for(const name of ai){room.resources[name]??=inventory();room.victory_points[name]??=0;room.turns_taken[name]??=0;room.ai_stalled_turns[name]??=0;room.ai_last_trade_turn[name]??=-100;room.knights[name]??=0;room.knights_played[name]??=0;}for(const name of Object.keys(room.resources))if(!room.players.includes(name)){delete room.resources[name];delete room.victory_points[name];delete room.turns_taken[name];delete room.ai_stalled_turns[name];delete room.ai_last_trade_turn[name];delete room.knights[name];delete room.knights_played[name];}note('Lobby configured for '+room.players.length+' players.');}
function setDifficulty(level){if(room.started)throw Error('Choose AI difficulty before starting.');if(!['easy','normal','hard','aggressive'].includes(level))throw Error('Invalid AI difficulty.');room.difficulty=level;note('AI difficulty: '+level+'.')}
function who(){return room.players[room.turn_index]}
function afford(p,k){return Object.entries(costs[k]).every(([r,n])=>room.resources[p][r]>=n)}
function valid(p,k){if(room.winner||!room.started||who()!==p)return [];const setup=room.phase==='setup';if(setup&&k!==room.setup_step)return [];if(!setup&&(!room.rolled||!afford(p,k)))return [];
if(k==='city')return setup?[]:Object.entries(room.buildings).filter(([v,o])=>o===p&&!room.cities.includes(v)).map(([v])=>v);
if(k==='settlement'){return V.map((_,i)=>'v'+i).filter(v=>{const i=Number(v.slice(1));if(room.buildings[v]!==undefined)return false;if(E.some(([a,b])=>(a===i&&room.buildings['v'+b]!==undefined)||(b===i&&room.buildings['v'+a]!==undefined)))return false;return setup||Object.entries(room.roads).some(([e,o])=>o===p&&E[Number(e.slice(1))].includes(i))})}
if(k==='road')return E.map((_,i)=>'e'+i).filter(e=>{if(room.roads[e]!==undefined)return false;const [a,b]=E[Number(e.slice(1))];if(setup)return [a,b].includes(room.setup_vertex);const reachable=v=>room.buildings['v'+v]!==undefined?room.buildings['v'+v]===p:Object.entries(room.roads).some(([e,o])=>o===p&&E[Number(e.slice(1))].includes(v));return reachable(a)||reachable(b)});return []}
function award(p,v){H.forEach((vs,i)=>{const r=resource[room.board.tiles[i].terrain];if(r&&vs.includes(v))room.resources[p][r]++})}
function build(p,k,loc){if(!valid(p,k).includes(loc))throw Error('Location is blocked, disconnected or you need more resources.');if(room.phase==='setup'){
if(k==='settlement'){room.buildings[loc]=p;room.victory_points[p]++;room.setup_vertex=Number(loc.slice(1));room.setup_step='road';if(room.setup_index>=room.players.length)award(p,room.setup_vertex)}
else{room.roads[loc]=p;room.setup_index++;room.setup_vertex=null;if(room.setup_index>=room.setup_order.length){room.phase='play';room.turn_index=0;room.setup_step='settlement';note('Setup complete! Roll dice to begin.')}else{room.turn_index=room.players.indexOf(room.setup_order[room.setup_index]);room.setup_step='settlement'}}
}else{Object.entries(costs[k]).forEach(([r,n])=>room.resources[p][r]-=n);if(k==='road')room.roads[loc]=p;else if(k==='settlement'){room.buildings[loc]=p;room.victory_points[p]++}else{room.cities.push(loc);room.victory_points[p]++}}
note(p+' built '+k+' at '+loc+'.');checkVictory(p)}
// Longest Road: edge-simple routes, blocked by opponents' settlements.
function longestRoadLength(player){
 const adjacent=V.map(()=>[]);
 for(const [edge,owner] of Object.entries(room.roads))if(owner===player){const id=Number(edge.slice(1)),[a,b]=E[id];adjacent[a].push([b,id]);adjacent[b].push([a,id]);}
 let best=0;
 function visit(vertex,used,length){best=Math.max(best,length);if(length&&room.buildings['v'+vertex]!==undefined&&room.buildings['v'+vertex]!==player)return;
 for(const [next,id] of adjacent[vertex])if(!used.has(id)){used.add(id);visit(next,used,length+1);used.delete(id)}}
 for(let i=0;i<V.length;i++)if(adjacent[i].length)visit(i,new Set(),0);
 return best;
}
function updateLongestRoad(){
 const lengths=Object.fromEntries(room.players.map(p=>[p,longestRoadLength(p)]));
 const best=Math.max(0,...Object.values(lengths));
 const leaders=room.players.filter(p=>lengths[p]===best);
 const old=room.road_owner;
 const next=best<5?null:leaders.length===1?leaders[0]:leaders.includes(old)?old:null;
 if(next!==old){room.road_owner=next;if(next)note(next+' earned Longest Road ('+best+' roads, +2 VP).');else if(old)note('Longest Road is no longer awarded.')}
}
function updateLargestArmy(){const best=Math.max(0,...Object.values(room.knights_played));const leaders=room.players.filter(p=>room.knights_played[p]===best);const old=room.army_owner;const next=best<3?null:leaders.length===1?leaders[0]:leaders.includes(old)?old:null;if(next!==old){room.army_owner=next;if(next)note(next+' earned Largest Army ('+best+' knights played, +2 VP).');else if(old)note('Largest Army is no longer awarded.')}}
function recalculateVictoryPoints(){for(const p of room.players){const owned=Object.entries(room.buildings).filter(([,owner])=>owner===p).map(([v])=>v);room.victory_points[p]=owned.length+owned.filter(v=>room.cities.includes(v)).length+(room.road_owner===p?2:0)+(room.army_owner===p?2:0)}}
function checkVictory(p){updateLongestRoad();updateLargestArmy();recalculateVictoryPoints();if(!room.winner){const winner=room.players.find(name=>room.victory_points[name]>=VICTORY_TARGET);if(winner){room.winner=winner;room.phase='finished';room.rolled=false;note(winner+' reached 10 victory points and won the game!')}}}
function produce(n){room.board.tiles.forEach((t,i)=>{if(t.number!==n||i===room.robber_tile)return;const r=resource[t.terrain];if(!r)return;H[i].forEach(v=>{const key='v'+v,p=room.buildings[key];if(p)room.resources[p][r]+=room.cities.includes(key)?2:1})})}
function startRobber(p,source){room.robber_pending={player:p,source};note(p+' must move the robber.');}
function robberTargets(p,tile){return [...new Set(H[tile].map(v=>room.buildings['v'+v]).filter(owner=>owner&&owner!==p&&Object.values(room.resources[owner]).some(n=>n>0)))];}
function moveRobber(p,tile,victim){if(!room.robber_pending||room.robber_pending.player!==p||who()!==p)throw Error('No robber move is pending for this player.');if(!Number.isInteger(tile)||tile<0||tile>=room.board.tiles.length||tile===room.robber_tile)throw Error('Choose a different tile.');const targets=robberTargets(p,tile);if(victim&& !targets.includes(victim))throw Error('That player cannot be robbed on this tile.');room.robber_tile=tile;room.robber_pending=null;const target=targets.includes(victim)?victim:targets[0];if(target){const cards=Object.entries(room.resources[target]).flatMap(([k,n])=>Array(n).fill(k));const stolen=cards[Math.floor(Math.random()*cards.length)];room.resources[target][stolen]--;room.resources[p][stolen]++;note(p+' stole one resource from '+target+'.')}note(p+' moved the robber to tile '+(tile+1)+'.');}
function roll(p){if(room.winner)throw Error('The game has ended.');if(room.phase==='setup'||room.rolled||who()!==p)throw Error('You cannot roll now.');const d=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];room.last_roll=d;room.rolled=true;note(p+' rolled '+d.join(' + ')+'.');const n=d[0]+d[1];if(n===7){Object.entries(room.resources).forEach(([name,inv])=>{const cards=Object.entries(inv).flatMap(([k,v])=>Array(v).fill(k));if(cards.length>7){shuffle(cards).slice(0,Math.floor(cards.length/2)).forEach(k=>inv[k]--);note(name+' discarded cards after a 7.')}});startRobber(p,'seven')}else produce(n)}
function buyKnight(p){if(room.winner||room.phase!=='play'||who()!==p||!room.rolled||room.robber_pending)throw Error('Cannot buy a Knight now.');if(!afford(p,'knight'))throw Error('A Knight costs 1 wheat, 1 wool and 1 ore.');for(const [r,n] of Object.entries(costs.knight))room.resources[p][r]-=n;room.knights[p]++;room.knight_bought_turn[p]=room.turn_number;note(p+' purchased a Knight card.');}
function playKnight(p){if(room.winner||room.phase!=='play'||who()!==p||!room.rolled||room.robber_pending)throw Error('Cannot play a Knight now.');if(!room.knights[p])throw Error('You have no Knight cards.');if(room.knight_used_turn[p]===room.turn_number)throw Error('Only one Knight may be played per turn.');if(room.knight_bought_turn[p]===room.turn_number)throw Error('A newly purchased Knight cannot be played this turn.');room.knights[p]--;room.knights_played[p]++;room.knight_used_turn[p]=room.turn_number;note(p+' played a Knight.');startRobber(p,'knight');checkVictory(p);}
function end(p){if(room.winner)throw Error('The game has ended.');if(who()!==p||!room.rolled||room.phase==='setup'||room.robber_pending)throw Error('Roll and resolve the robber before ending your turn.');room.turns_taken[p]++;room.turn_index=(room.turn_index+1)%room.players.length;room.turn_number++;room.rolled=false;room.last_roll=null;note('Turn passed to '+who()+'.')}
function aiTrade(body){
const player=room.players[0],ai=body.ai_player,give=body.give||{},want=body.want||{};
if(!room.ai_players.includes(ai))throw Error('Select an AI opponent.');if(room.winner||room.phase!=='play'||who()!==player||!room.rolled||room.robber_pending)throw Error('Trade only after resolving your roll.');
for(const k of Object.keys(give).concat(Object.keys(want)))if(!Object.hasOwn(inventory(),k))throw Error('Invalid resource.');
for(const [k,n] of Object.entries(give))if(!Number.isInteger(n)||n<0||n>room.resources[player][k])throw Error('Not enough resources to offer.');
for(const [k,n] of Object.entries(want))if(!Number.isInteger(n)||n<0)throw Error('Invalid request.');
const total=o=>Object.values(o).reduce((a,b)=>a+b,0);
if(!total(give)||!total(want))throw Error('Choose at least one resource on each side.');
const scarcity=key=>{const inv=room.resources[ai];return Math.max(...Object.entries(costs).map(([type,c])=>{const deficit=Object.entries(c).reduce((n,[r,v])=>n+Math.max(0,v-inv[r]),0);return deficit>0&&c[key]&&inv[key]<c[key]?c[key]/(1+deficit):0}));};
const value=o=>Object.entries(o).reduce((sum,[k,n])=>sum+n*(1+scarcity(k)*2+(room.resources[ai][k]===0?.3:0)),0);
const canGive=Object.entries(want).every(([k,n])=>room.resources[ai][k]>=n);
if(canGive&&value(give)>=value(want)*({easy:0.85,normal:1.1,hard:1.3,aggressive:1.55}[room.difficulty]))return {accepted:true,ai_player:ai,give,want,message:ai+' accepts your trade!'};
const desired=Object.keys(inventory()).filter(k=>room.resources[player][k]>0).sort((a,b)=>scarcity(b)-scarcity(a));
const available=Object.keys(inventory()).filter(k=>room.resources[ai][k]>0).sort((a,b)=>scarcity(a)-scarcity(b));
if(!desired.length||!available.length)return {accepted:false,ai_player:ai,unavailable:true,message:ai+' declines your trade.'};
const wanted=Object.keys(give).filter(k=>give[k]>0).sort((a,b)=>scarcity(b)-scarcity(a))[0]||desired[0];
const offered=Object.keys(want).filter(k=>want[k]>0&&room.resources[ai][k]>0).sort((a,b)=>scarcity(a)-scarcity(b))[0]||available[0];
const count=Math.min(room.resources[player][wanted],Math.max(1,Math.ceil((1+scarcity(offered)*2)/(1+scarcity(wanted)*2))));
return {accepted:false,ai_player:ai,give:{[wanted]:count},want:{[offered]:1},message:ai+' proposes a counteroffer.'};
}
function finishTrade(body){const p=room.players[0],ai=body.ai_player,give=body.give||{},want=body.want||{};
if(!room.ai_players.includes(ai))throw Error('Select an AI opponent.');if(room.winner||room.phase!=='play'||who()!==p||!room.rolled||room.robber_pending)throw Error('It is no longer your trading turn.');
for(const [k,n] of Object.entries(give))if(!Object.hasOwn(inventory(),k)||!Number.isInteger(n)||n<0||room.resources[p][k]<n)throw Error('Your offer is no longer available.');
for(const [k,n] of Object.entries(want))if(!Object.hasOwn(inventory(),k)||!Number.isInteger(n)||n<0||room.resources[ai][k]<n)throw Error('AI resources changed.');
if(!Object.values(give).some(n=>n>0)||!Object.values(want).some(n=>n>0))throw Error('Trade must exchange resources.');
for(const [k,n] of Object.entries(give)){room.resources[p][k]-=n;room.resources[ai][k]+=n}
for(const [k,n] of Object.entries(want)){room.resources[ai][k]-=n;room.resources[p][k]+=n}
note(p+' traded resources with '+ai+'.');return {success:true};}
function publicRoom(){recalculateVictoryPoints();const p=room.players[0];return {...room,current_player:who(),colors:Object.fromEntries(room.players.map((n,i)=>[n,['blue','red','green','yellow'][i]])),connected:Object.fromEntries(room.players.map(n=>[n,true])),resource_counts:Object.fromEntries(room.players.map(n=>[n,Object.values(room.resources[n]).reduce((a,b)=>a+b,0)])),valid_builds:Object.fromEntries(['settlement','road','city'].map(k=>[k,valid(who(),k)])),my_inventory:{...room.resources[p]},spectators:[],departed:[]}}
function broadcast(){if(ws&&ws.readyState===1&&room)ws.onmessage?.({data:JSON.stringify({type:'room_update',room:publicRoom()})})}
function proposeAiTrade(){
const ai=who(),human=room.players[0],inv=room.resources[ai],other=room.resources[human];
if(room.turns_taken[ai]<6||room.ai_stalled_turns[ai]<({easy:9,normal:7,hard:5,aggressive:3}[room.difficulty])||room.ai_trade_offer||room.turns_taken[ai]-room.ai_last_trade_turn[ai]<3)return;
const target=['settlement','road'].find(k=>{const saved=room.rolled;room.rolled=true;const possible=valid(ai,k).length>0;room.rolled=saved;return possible||Object.entries(costs[k]).some(([r,n])=>inv[r]<n)});
if(!target)return;
const missing=Object.entries(costs[target]).filter(([r,n])=>inv[r]<n&&other[r]>0).sort((a,b)=>(b[1]-inv[b[0]])-(a[1]-inv[a[0]]));
if(!missing.length)return;
const [needed]=missing[0];
const surplus=Object.keys(inv).filter(r=>r!==needed&&inv[r]>0&&inv[r]>=(costs[target][r]||0)+1).sort((a,b)=>inv[b]-inv[a]);
if(!surplus.length)return;
const offered=surplus[0];room.ai_trade_offer={give:{[needed]:1},want:{[offered]:1},ai_player:ai,turn:room.turns_taken[ai]};
room.ai_last_trade_turn[ai]=room.turns_taken[ai];note(ai+' offered 1 '+offered+' for 1 '+needed+' to help build a '+target+'.');
}
function respondAiTrade(body){const offer=room.ai_trade_offer;if(!offer)throw Error('There is no pending AI offer.');
room.ai_trade_offer=null;if(!body.accept){note('You declined the AI trade offer.');return {success:true}};
const p=room.players[0],ai=offer.ai_player;for(const [k,n] of Object.entries(offer.give))if(room.resources[p][k]<n)throw Error('You no longer have the requested resources.');
for(const [k,n] of Object.entries(offer.want))if(room.resources[ai][k]<n)throw Error('AI no longer has its offered resources.');
for(const [k,n] of Object.entries(offer.give)){room.resources[p][k]-=n;room.resources[ai][k]+=n}
for(const [k,n] of Object.entries(offer.want)){room.resources[ai][k]-=n;room.resources[p][k]+=n}
note('You accepted the AI trade offer.');return {success:true};}
function aiPick(k,options){if(k==='city'){return options.map(v=>{let score=0;H.forEach((vs,i)=>{if(vs.includes(Number(v.slice(1))))score+=room.board.tiles[i].number?6-Math.abs(7-room.board.tiles[i].number):0});return {v,score:score+(room.difficulty==='easy'?Math.random()*40:Math.random()*2)}}).sort((a,b)=>b.score-a.score)[0]?.v}
if(k==='settlement'){return options.map(v=>{const index=Number(v.slice(1));let score=0;H.forEach((vs,i)=>{if(vs.includes(index)){const t=room.board.tiles[i];score+=t.number?6-Math.abs(7-t.number):0}});return {v,score:score+(room.difficulty==='easy'?Math.random()*30:Math.random()*.8)}}).sort((a,b)=>b.score-a.score)[0]?.v}
if(k==='road'){
  if(room.difficulty==='easy'&&Math.random()<.6)return options[Math.floor(Math.random()*options.length)];
  // Prefer roads leading to an unoccupied, distance-rule-legal settlement site.
  // Random roads can trap the AI in dead ends even when it has enough resources.
  const openSites=V.map((_,i)=>i).filter(i=>room.buildings['v'+i]===undefined&&!E.some(([a,b])=>(a===i&&room.buildings['v'+b]!==undefined)||(b===i&&room.buildings['v'+a]!==undefined)));
  const neighbors=V.map(()=>[]);
  E.forEach(([a,b],i)=>{if(room.roads['e'+i]===undefined){neighbors[a].push(b);neighbors[b].push(a)}});
  const distances=V.map(()=>Infinity),queue=[];
  for(const site of openSites){distances[site]=0;queue.push(site)}
  for(let qi=0;qi<queue.length;qi++){const v=queue[qi];for(const next of neighbors[v]){if(room.buildings['v'+next]!==undefined)continue;if(distances[next]>distances[v]+1){distances[next]=distances[v]+1;queue.push(next)}}}
  return options.map(e=>{const [a,b]=E[Number(e.slice(1))];const dist=Math.min(distances[a],distances[b]);const nearOpen=openSites.includes(a)||openSites.includes(b);return {e,score:(nearOpen?100:0)+(Number.isFinite(dist)?30-10*dist:-100)+(room.difficulty==='aggressive'?room.road_owner===who()?25:room.road_owner?40:15:0)+Math.random()}}).sort((a,b)=>b.score-a.score)[0]?.e;
}
return options[Math.floor(Math.random()*options.length)]}
function aiMoveRobber(p){const options=room.board.tiles.map((t,i)=>i).filter(i=>i!==room.robber_tile);const score=i=>{const victims=robberTargets(p,i);const own=H[i].filter(v=>room.buildings['v'+v]===p).length;const number=room.board.tiles[i].number;const strength=number?6-Math.abs(7-number):0;const enemy=H[i].filter(v=>room.buildings['v'+v]&&room.buildings['v'+v]!==p).length;const leading=victims.reduce((best,v)=>Math.max(best,room.victory_points[v]||0),0);return enemy*strength+(room.difficulty==='aggressive'?leading*2:0)-(own*strength*2)+(victims.length?4:0)};const tile=room.difficulty==='easy'?options[Math.floor(Math.random()*options.length)]:options.sort((a,b)=>score(b)-score(a))[0];const victims=robberTargets(p,tile).sort((a,b)=>(room.victory_points[b]||0)-(room.victory_points[a]||0));moveRobber(p,tile,victims[0]);}
function aiAct(){if(room?.winner||aiBusy||!room?.started||!room.ai_players.includes(who()))return;aiBusy=true;setTimeout(()=>{try{let guard=0;while(room&&!room.winner&&room.ai_players.includes(who())&&guard++<40){const p=who();if(room.phase==='setup'){const k=room.setup_step,opts=valid(p,k);if(!opts.length)break;build(p,k,aiPick(k,opts));broadcast();continue}if(!room.rolled){roll(p);broadcast()}if(room.robber_pending){aiMoveRobber(p);broadcast()}if(room.winner)break;if(afford(p,'knight')&&room.knights[p]<2&&Math.random()<({easy:.05,normal:.18,hard:.35,aggressive:.55}[room.difficulty]))buyKnight(p);if(room.knights[p]&&room.knight_bought_turn[p]!==room.turn_number&&room.knight_used_turn[p]!==room.turn_number&&Math.random()<({easy:.18,normal:.42,hard:.7,aggressive:.95}[room.difficulty])){playKnight(p);aiMoveRobber(p)}let builtThisTurn=false;for(const [k,max] of (room.difficulty==='aggressive'?[['settlement',1],['road',3],['city',1]]:room.difficulty==='hard'?[['settlement',1],['city',1],['road',2]]:[['city',1],['settlement',1],['road',2]]))for(let i=0;i<max;i++){const opts=valid(p,k);if(!opts.length)break;build(p,k,aiPick(k,opts));if(k==='road'||k==='settlement')builtThisTurn=true;if(room.winner)break}if(!room.winner){room.ai_stalled_turns[p]=builtThisTurn?0:room.ai_stalled_turns[p]+1;proposeAiTrade();end(p)}broadcast()}}finally{aiBusy=false;broadcast()}},650)}
const origFetch=window.fetch.bind(window);
window.fetch=async(input,opts)=>{const path=String(input);if(path==='/api/board-geometry')return new Response(JSON.stringify({vertices:V,edges:E,hex_vertices:H}),{status:200,headers:{'Content-Type':'application/json'}});
if(!path.startsWith('/api/'))return origFetch(input,opts);
let result={success:true};try{const body=opts?.body?JSON.parse(opts.body):{};const action=path.split('/').pop();if(path==='/api/rooms'){result=startRoom(body.player_name)}else if(!room)throw Error('Start a new demo first.');else if(action==='set-ai-count'){setAiCount(body.count)}else if(action==='set-difficulty'){setDifficulty(body.difficulty)}else if(action==='start'){room.started=true;room.phase='setup';room.setup_order=[...room.players,...room.players.slice().reverse()];note('Game started! Place your first settlement, then a road.')}else if(action==='roll')roll(room.players[0]);else if(action==='robber-move')moveRobber(room.players[0],body.tile,body.victim);else if(action==='knight-buy')buyKnight(room.players[0]);else if(action==='knight-play')playKnight(room.players[0]);else if(action==='end-turn')end(room.players[0]);else if(action==='build')build(room.players[0],body.kind,body.location);else if(action==='trade-propose')result={success:true,...aiTrade(body)};else if(action==='trade-accept')result=finishTrade(body);else if(action==='ai-trade-respond')result=respondAiTrade(body);else if(action==='reset'){const name=room.host,count=room.ai_players.length,difficulty=room.difficulty;startRoom(name);setAiCount(count);setDifficulty(difficulty)}else if(action==='leave'||action==='end-session'){room=null}else if(action==='kick'){if(room.started)throw Error('Cannot remove AI players during a game.');const target=body.player_name;if(!room.ai_players.includes(target))throw Error('Only AI opponents can be removed.');setAiCount(room.ai_players.length-1)}else throw Error('Online multiplayer is not available in the browser demo.');}catch(e){result={success:false,error:e.message}};
queueMicrotask(()=>{broadcast();aiAct()});return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}})};
class LocalWebSocket{static OPEN=1;constructor(){this.readyState=0;ws=this;setTimeout(()=>{this.readyState=1;this.onopen?.();broadcast()},35)}send(msg){const data=JSON.parse(msg);if(data.type==='ping')setTimeout(()=>this.onmessage?.({data:JSON.stringify({type:'pong',id:data.id})}),20)}close(){this.readyState=3;this.onclose?.();if(ws===this)ws=null}}
window.WebSocket=LocalWebSocket;
})();